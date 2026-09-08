import { NextRequest, NextResponse } from "next/server";
import { purchaseItem } from "../../../../lib/gamification/shop";

export async function POST(req: NextRequest) {
  const body = await req.json() as { shopItemId?: string; userId?: string };
  if (!body.shopItemId) return NextResponse.json({ error: "shopItemId required" }, { status: 400 });
  const userId = body.userId ?? req.headers.get("x-user-id") ?? "00000000-0000-0000-0000-000000000000";
  try {
    const inv = await purchaseItem(userId, body.shopItemId);
    return NextResponse.json({ inventory: inv });
  } catch (e) {
    const msg = String((e as Error).message);
    const status = msg.includes("Insufficient") ? 402 : msg.includes("Already") ? 409 : msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
