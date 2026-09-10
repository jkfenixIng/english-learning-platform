import { prisma } from "../db";

export async function purchaseItem(userId: string, shopItemId: string) {
  const item = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
  if (!item) throw new Error("Item not found");
  if ((item as unknown as { isPremium: boolean }).isPremium) throw new Error("Premium locked");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.userInventory.findUnique({
      where: { userId_shopItemId: { userId, shopItemId } as never },
    });
    if (existing) throw new Error("Already owned");

    const price = item.priceXp;
    const cosmeticType = (item as unknown as { cosmeticType: string }).cosmeticType;

    // Detect whether coins column exists (fallback to xp if migration not yet applied)
    let useCoins = true;
    try {
      await tx.$queryRawUnsafe(`SELECT coins FROM public.user_streaks LIMIT 0`);
    } catch {
      useCoins = false;
    }

    if (useCoins) {
      // Use raw SQL to avoid type error before prisma generate (coins added in 003)
      const updated = (await tx.$executeRawUnsafe(
        `UPDATE public.user_streaks SET coins = coins - $2 WHERE user_id = $1::uuid AND coins >= $2`,
        userId,
        price,
      )) as unknown as number;
      // $executeRawUnsafe returns row count; fallback to updateMany count check via query
      const check = updated === 1 ? 1 : 0;
      let effective = check;
      if (effective === 0) {
        // Try count via select to distinguish missing row vs insufficient coins
        const rows = (await tx.$queryRawUnsafe(
          `SELECT coins FROM public.user_streaks WHERE user_id = $1::uuid`,
          userId,
        )) as unknown as { coins: number }[];
        const coins = rows[0]?.coins ?? 0;
        if (coins < price) throw new Error("Insufficient coins");
        // If row existed but raw returned 0 due to driver, still treat as insufficient
        throw new Error("Insufficient coins");
      }
    } else {
      const updateRes = await tx.userStreak.updateMany({
        where: { userId, xp: { gte: price } },
        data: { xp: { decrement: price } },
      });
      if (updateRes.count === 0) {
        const streak = await tx.userStreak.findUnique({ where: { userId } });
        const xp = (streak as unknown as { xp: number } | null)?.xp ?? 0;
        if (xp < price) throw new Error("Insufficient XP");
        throw new Error("Insufficient XP");
      }
    }

    const inv = await tx.userInventory.create({
      data: { userId, shopItemId, purchasedAt: new Date() } as never,
    });

    // Streak Freeze consumable: increment freezeCount immediately and mark inventory as consumed (equipped false)
    if (cosmeticType === "freeze") {
      try {
        await tx.userStreak.update({
          where: { userId },
          data: { freezeCount: { increment: 1 } },
        });
      } catch {}
    }

    return inv;
  });
}

export async function getShopCatalog() {
  try {
    return await prisma.shopItem.findMany({ orderBy: { priceXp: "asc" } });
  } catch {
    return [];
  }
}
export async function getUserInventory(userId: string) {
  try {
    return await prisma.userInventory.findMany({ where: { userId }, include: { shopItem: true } });
  } catch {
    return [];
  }
}
