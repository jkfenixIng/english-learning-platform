import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../lib/db";
import { createClient } from "../../../../lib/supabase/server";
import { ShopPaywallClient } from "../../../../components/shop/ShopPaywallClient";

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shopPage" });
  // also need paywall/game strings for fallback items
  let items: {
    id: string;
    title: string;
    description?: string;
    priceXp: number;
    cosmeticType: string;
    rarity: string;
    assetUrl?: string | null;
    isPremium?: boolean;
  }[] = [];
  try {
    items = (await prisma.shopItem.findMany({
      orderBy: { priceXp: "asc" },
    })) as unknown as typeof items;
  } catch {}
  if (items.length === 0)
    items = [
      {
        id: "1",
        title: t("fallbackStreakFreeze"),
        description: "",
        priceXp: 100,
        cosmeticType: "freeze",
        rarity: "common",
        assetUrl: "/lesson-images/shop/streak-freeze.png",
      },
      {
        id: "2",
        title: t("fallbackAvatarHat"),
        description: "",
        priceXp: 200,
        cosmeticType: "avatar",
        rarity: "rare",
        assetUrl: "/lesson-images/shop/avatar-hat.png",
      },
      {
        id: "premium-1",
        title: t("fallbackPremiumFrame"),
        description: "",
        priceXp: 800,
        cosmeticType: "frame",
        rarity: "legendary",
        assetUrl: "/lesson-images/shop/avatar-frame-diamond.png",
        isPremium: true,
      },
    ];

  // Fetch user XP + inventory via Supabase auth
  let userXp = 0;
  let inventory: unknown[] = [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      const streak = await prisma.userStreak.findUnique({ where: { userId: user.id } });
      userXp = (streak as unknown as { xp: number } | null)?.xp ?? 0;
      try {
        const inv = await prisma.userInventory.findMany({
          where: { userId: user.id },
          include: { shopItem: true },
        });
        inventory = inv as unknown as typeof inventory;
      } catch {
        inventory = [];
      }
    }
  } catch {
    // unauthenticated or db unavailable
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-sm text-gray-500">{t("subtitle")}</p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {t("yourXp", { xp: userXp })}
      </p>
      <ShopPaywallClient items={items} userXp={userXp} initialInventory={inventory as never} />
    </div>
  );
}
