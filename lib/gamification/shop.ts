import { prisma } from "../db";

export async function purchaseItem(userId: string, shopItemId: string) {
  const item = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
  if (!item) throw new Error("Item not found");
  const streak = await prisma.userStreak.findUnique({ where: { userId } });
  const xp = streak?.xp ?? 0;
  if (xp < item.priceXp) throw new Error("Insufficient XP");
  const existing = await prisma.userInventory.findUnique({ where: { userId_shopItemId: { userId, shopItemId } as never } });
  if (existing) throw new Error("Already owned");
  await prisma.userStreak.update({ where: { userId }, data: { xp: { decrement: item.priceXp } } });
  return prisma.userInventory.create({ data: { userId, shopItemId, purchasedAt: new Date() } as never });
}

export async function getShopCatalog() {
  try { return await prisma.shopItem.findMany({ orderBy: { priceXp: "asc" } }); } catch { return []; }
}
export async function getUserInventory(userId: string) {
  try { return await prisma.userInventory.findMany({ where: { userId }, include: { shopItem: true } }); } catch { return []; }
}
