import { prisma } from "../../../lib/db";

export default async function ShopPage() {
  let items: { id: string; title: string; priceXp: number; cosmeticType: string; rarity: string }[] = [];
  try { items = await prisma.shopItem.findMany({ orderBy: { priceXp: "asc" } }); } catch {}
  if (items.length === 0) items = [{ id: "1", title: "Streak Freeze", priceXp: 100, cosmeticType: "freeze", rarity: "common" }, { id: "2", title: "Avatar Hat", priceXp: 200, cosmeticType: "avatar", rarity: "rare" }];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Shop (XP)</h1>
      <p className="text-sm text-gray-500">Cosmetic avatars & boosts — XP currency, no real money</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border bg-white p-4 dark:bg-gray-900">
            <p className="font-medium">{it.title}</p>
            <p className="text-xs text-gray-500">{it.cosmeticType} · {it.rarity}</p>
            <p className="mt-2 text-sm font-semibold">{it.priceXp} XP</p>
            <form action="/api/shop/purchase" method="post">
              <input type="hidden" name="shopItemId" value={it.id} />
              <button type="submit" className="mt-2 rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700">Buy</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
