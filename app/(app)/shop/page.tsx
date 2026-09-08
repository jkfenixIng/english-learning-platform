import { prisma } from "../../../lib/db";
import { ShopPaywallClient } from "../../../components/shop/ShopPaywallClient";

export default async function ShopPage() {
  let items: { id: string; title: string; priceXp: number; cosmeticType: string; rarity: string; isPremium?: boolean }[] = [];
  try { items = await prisma.shopItem.findMany({ orderBy: { priceXp: "asc" } }); } catch {}
  if (items.length === 0) items = [{ id: "1", title: "Streak Freeze", priceXp: 100, cosmeticType: "freeze", rarity: "common" }, { id: "2", title: "Avatar Hat", priceXp: 200, cosmeticType: "avatar", rarity: "rare" }, { id: "premium-1", title: "Premium Badge Frame — Diamond", priceXp: 800, cosmeticType: "frame", rarity: "legendary", isPremium: true }];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Shop (XP)</h1>
      <p className="text-sm text-gray-500">Cosmetic avatars & boosts — XP currency, no real money. Premium items show paywall placeholder (future Stripe).</p>
      <ShopPaywallClient items={items} />
    </div>
  );
}
