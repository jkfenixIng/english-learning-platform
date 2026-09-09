import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { purchaseItem } from "../../../../lib/gamification/shop";
import { prisma } from "../../../../lib/db";

export async function POST(req: NextRequest) {
  // Auth via Supabase — no fallback UUID, no body/header userId
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 });
  }
  const userId = user.id;

  // Parse JSON body — frontend now sends JSON; also handle form fallback gracefully
  let shopItemId: string | undefined;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { shopItemId?: string };
      shopItemId = body.shopItemId;
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await req.formData();
      shopItemId = (form.get("shopItemId") as string) ?? undefined;
    } else {
      // try JSON as default
      const body = (await req.json()) as { shopItemId?: string };
      shopItemId = body.shopItemId;
    }
  } catch {
    return NextResponse.json({ error: "shopItemId required" }, { status: 400 });
  }

  if (!shopItemId) return NextResponse.json({ error: "shopItemId required" }, { status: 400 });

  // Backend premium block — defense in depth (also enforced in purchaseItem)
  try {
    const item = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
    if (item?.isPremium) {
      return NextResponse.json({ error: "Premium locked — upgrade required" }, { status: 403 });
    }
  } catch {
    // ignore lookup failure; let purchaseItem handle it
  }

  try {
    const inv = await purchaseItem(userId, shopItemId);
    return NextResponse.json({ inventory: inv });
  } catch (e) {
    const msg = String((e as Error).message);
    if (msg.includes("Premium locked")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    const status = msg.includes("Insufficient")
      ? 402
      : msg.includes("Already")
        ? 409
        : msg.includes("not found")
          ? 404
          : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
