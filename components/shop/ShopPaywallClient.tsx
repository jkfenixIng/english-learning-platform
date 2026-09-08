"use client";
import { useState } from "react";
import { PaywallPlaceholder } from "../monetization/PaywallPlaceholder";

type Item = { id: string; title: string; priceXp: number; cosmeticType: string; rarity: string; isPremium?: boolean };

export function ShopPaywallClient({ items }: { items: Item[] }) {
  const [paywallFor, setPaywallFor] = useState<string | null>(null);
  const premiumTitle = items.find((i) => i.id === paywallFor)?.title ?? "Premium item";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border bg-white p-4 dark:bg-gray-900 dark:border-gray-800" aria-label={`Shop item ${it.title}`}>
            <p className="font-medium">{it.title} {it.isPremium ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">Premium</span> : null}</p>
            <p className="text-xs text-gray-500">{it.cosmeticType} · {it.rarity}</p>
            <p className="mt-2 text-sm font-semibold">{it.priceXp} XP</p>
            {it.isPremium ? (
              <button onClick={() => setPaywallFor(it.id)} className="mt-2 rounded border px-3 py-1 text-xs" aria-label={`Unlock premium ${it.title}`}>Unlock — Premium</button>
            ) : (
              <form action="/api/shop/purchase" method="post">
                <input type="hidden" name="shopItemId" value={it.id} />
                <button type="submit" className="mt-2 rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700" aria-label={`Buy ${it.title}`}>Buy</button>
              </form>
            )}
          </div>
        ))}
      </div>
      {paywallFor ? <PaywallPlaceholder itemTitle={premiumTitle} onClose={() => setPaywallFor(null)} /> : null}
    </>
  );
}
