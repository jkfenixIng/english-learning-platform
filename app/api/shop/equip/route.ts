import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { equipItem, unequipItem } from "../../../../lib/gamification/equip";
import { prisma } from "../../../../lib/db";

export async function POST(req: NextRequest) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { shopItemId?: string; equipped?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "shopItemId required" }, { status: 400 });
  }
  const { shopItemId, equipped } = body;
  if (!shopItemId) return NextResponse.json({ error: "shopItemId required" }, { status: 400 });

  // Validate ownership early
  try {
    const owned = await prisma.userInventory.findUnique({
      where: { userId_shopItemId: { userId: user.id, shopItemId } as never },
    });
    if (!owned) return NextResponse.json({ error: "Not owned — purchase first" }, { status: 403 });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }

  try {
    if (equipped === false) {
      const res = await unequipItem(user.id, shopItemId);
      return NextResponse.json({ inventory: res });
    }
    const res = await equipItem(user.id, shopItemId);
    return NextResponse.json({ inventory: res });
  } catch (e) {
    const msg = String((e as Error).message);
    const status = msg.includes("Not owned") ? 403 : msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
