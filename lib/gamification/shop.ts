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

    const updateRes = await tx.userStreak.updateMany({
      where: { userId, xp: { gte: item.priceXp } },
      data: { xp: { decrement: item.priceXp } },
    });
    if (updateRes.count === 0) {
      const streak = await tx.userStreak.findUnique({ where: { userId } });
      const xp = (streak as unknown as { xp: number } | null)?.xp ?? 0;
      if (xp < item.priceXp) throw new Error("Insufficient XP");
      // Fallback if streak missing but update failed for other reason
      throw new Error("Insufficient XP");
    }

    return tx.userInventory.create({
      data: { userId, shopItemId, purchasedAt: new Date() } as never,
    });
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
