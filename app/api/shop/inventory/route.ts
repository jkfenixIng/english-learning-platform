import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { prisma } from "../../../../lib/db";

export async function GET() {
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

  try {
    // Try with equipped column; fallback if migration not yet applied
    const inventory = await prisma.userInventory.findMany({
      where: { userId: user.id },
      include: { shopItem: true },
      orderBy: { purchasedAt: "desc" },
    });
    return NextResponse.json({ inventory });
  } catch (e) {
    // Fallback without equipped if column missing
    try {
      const inventory = await prisma.$queryRawUnsafe(
        `SELECT ui.user_id as "userId", ui.shop_item_id as "shopItemId", ui.purchased_at as "purchasedAt", si.id as "shopId", si.title, si.description, si.price_xp as "priceXp", si.cosmetic_type as "cosmeticType", si.asset_url as "assetUrl", si.rarity, si.is_premium as "isPremium"
         FROM public.user_inventory ui JOIN public.shop_items si ON si.id = ui.shop_item_id WHERE ui.user_id = $1::uuid ORDER BY ui.purchased_at DESC`,
        user.id,
      );
      return NextResponse.json({ inventory: inventory as unknown[] });
    } catch {
      return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
    }
  }
}
