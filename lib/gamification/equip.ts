import { prisma } from "../db";

/**
 * Single-equip cosmeticTypes — only one item of these types can be equipped at a time.
 * "freeze" and "boost" are consumables, not equipables. "title"/"effect" can be multiple but we treat as single for simplicity.
 */
export const SINGLE_EQUIP_TYPES = new Set([
  "theme",
  "frame",
  "avatar",
  "background",
  "pet",
  "title",
  "effect",
  "bundle",
]);

/**
 * Theme mapping: shopItem title or id hint -> preferences.theme value.
 * We support light/dark + cosmetic themes. Cosmetic themes are stored as UserPreferences.theme string.
 * The store Theme type is widened in preferences.ts to allow these values.
 */
export function themeValueForItem(item: {
  title: string;
  cosmeticType: string;
  assetUrl?: string | null;
}): string | null {
  if (item.cosmeticType !== "theme") return null;
  const t = item.title.toLowerCase();
  if (t.includes("ocean")) return "ocean";
  if (t.includes("midnight")) return "midnight";
  if (t.includes("forest")) return "forest";
  if (t.includes("sunset")) return "sunset";
  if (t.includes("aurora")) return "aurora";
  // fallback: slugify title
  return t.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || null;
}

export async function getEquippedItems(userId: string) {
  try {
    return await prisma.userInventory.findMany({
      where: { userId, equipped: true } as never,
      include: { shopItem: true },
    });
  } catch {
    // column might not exist yet if migration not run — fallback to empty
    return [];
  }
}

export async function equipItem(userId: string, shopItemId: string) {
  const item = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
  if (!item) throw new Error("Item not found");

  // Verify ownership
  const owned = await prisma.userInventory.findUnique({
    where: { userId_shopItemId: { userId, shopItemId } as never },
  });
  if (!owned) throw new Error("Not owned — purchase first");

  // Premium check already handled at purchase, but allow equip if owned
  const cosmeticType = (item as unknown as { cosmeticType: string }).cosmeticType;

  return prisma.$transaction(async (tx) => {
    // For single-equip types, unequip others of same cosmeticType
    if (SINGLE_EQUIP_TYPES.has(cosmeticType)) {
      // Find other equipped items of same type for this user (need join)
      const equipped = await tx.userInventory.findMany({
        where: { userId, equipped: true } as never,
        include: { shopItem: true },
      });
      const toUnequip = (
        equipped as unknown as { shopItemId: string; shopItem: { cosmeticType: string } }[]
      ).filter((e) => e.shopItem.cosmeticType === cosmeticType && e.shopItemId !== shopItemId);
      for (const u of toUnequip) {
        await tx.userInventory.update({
          where: { userId_shopItemId: { userId, shopItemId: u.shopItemId } as never },
          data: { equipped: false, equippedAt: null } as never,
        });
      }
    }

    const updated = await tx.userInventory.update({
      where: { userId_shopItemId: { userId, shopItemId } as never },
      data: { equipped: true, equippedAt: new Date() } as never,
      include: { shopItem: true } as never,
    });

    // Side-effect: if theme, update UserPreferences.theme
    const themeVal = themeValueForItem(
      item as unknown as { title: string; cosmeticType: string; assetUrl: string | null },
    );
    if (themeVal) {
      try {
        await tx.userPreferences.upsert({
          where: { userId },
          update: { theme: themeVal } as never,
          create: { userId, theme: themeVal } as never,
        });
      } catch {
        // preferences table might not have row — ignore, client syncs via store
      }
    }

    return updated;
  });
}

export async function unequipItem(userId: string, shopItemId: string) {
  const owned = await prisma.userInventory.findUnique({
    where: { userId_shopItemId: { userId, shopItemId } as never },
    include: { shopItem: true } as never,
  });
  if (!owned) throw new Error("Not owned");
  if (!(owned as unknown as { equipped: boolean }).equipped) return owned;

  const updated = await prisma.userInventory.update({
    where: { userId_shopItemId: { userId, shopItemId } as never },
    data: { equipped: false, equippedAt: null } as never,
    include: { shopItem: true } as never,
  });

  // If theme unequipped, reset to "light" (or keep as is — we reset to light for predictability)
  const shopItem = (owned as unknown as { shopItem: { cosmeticType: string; title: string } })
    .shopItem;
  if (shopItem.cosmeticType === "theme") {
    try {
      const themeVal = themeValueForItem(
        shopItem as unknown as { title: string; cosmeticType: string },
      );
      // Only reset if current preference equals that theme
      const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
      if (prefs && (prefs as unknown as { theme: string }).theme === themeVal) {
        await prisma.userPreferences.update({
          where: { userId },
          data: { theme: "light" } as never,
        });
      }
    } catch {}
  }

  return updated;
}
