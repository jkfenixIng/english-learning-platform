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

  // Fetch user XP + coins + inventory via Supabase auth (coins separado, XP no baja al comprar)
  let userXp = 0;
  let userCoins = 0;
  let inventory: unknown[] = [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      try {
        const row = (await prisma.$queryRawUnsafe(
          `SELECT xp, coins, freeze_count as "freezeCount" FROM public.user_streaks WHERE user_id = $1::uuid`,
          user.id,
        )) as unknown as { xp: number; coins: number; freezeCount: number }[];
        if (row[0]) {
          userXp = row[0].xp ?? 0;
          userCoins = row[0].coins ?? row[0].xp ?? 0;
        }
      } catch {
        const streak = await prisma.userStreak.findUnique({ where: { userId: user.id } });
        userXp = (streak as unknown as { xp: number } | null)?.xp ?? 0;
        userCoins = (streak as unknown as { coins: number; xp: number } | null)?.coins ?? userXp;
      }
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
      <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-amber-50 px-3 py-1 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span aria-hidden>⭐</span> XP {userXp}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-sky-50 px-3 py-1 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
          <span aria-hidden>🪙</span> Monedas {userCoins}
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        XP = nivel (no se gasta). Monedas = compras. Gana 1 moneda por cada XP.
      </p>
      <ShopPaywallClient
        items={items}
        userXp={userXp}
        userCoins={userCoins}
        initialInventory={inventory as never}
      />
    </div>
  );
}
