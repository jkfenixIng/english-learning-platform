import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../lib/db";
import { ShopPaywallClient } from "../../../../components/shop/ShopPaywallClient";

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shopPage" });
  // also need paywall/game strings for fallback items
  let items: {
    id: string;
    title: string;
    priceXp: number;
    cosmeticType: string;
    rarity: string;
    isPremium?: boolean;
  }[] = [];
  try {
    items = await prisma.shopItem.findMany({ orderBy: { priceXp: "asc" } });
  } catch {}
  if (items.length === 0)
    items = [
      {
        id: "1",
        title: t("fallbackStreakFreeze"),
        priceXp: 100,
        cosmeticType: "freeze",
        rarity: "common",
      },
      {
        id: "2",
        title: t("fallbackAvatarHat"),
        priceXp: 200,
        cosmeticType: "avatar",
        rarity: "rare",
      },
      {
        id: "premium-1",
        title: t("fallbackPremiumFrame"),
        priceXp: 800,
        cosmeticType: "frame",
        rarity: "legendary",
        isPremium: true,
      },
    ];
  const tShop = await getTranslations({ locale, namespace: "shopPage" });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{tShop("title")}</h1>
      <p className="text-sm text-gray-500">{tShop("subtitle")}</p>
      <ShopPaywallClient items={items} />
    </div>
  );
}
