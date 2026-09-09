"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { PaywallPlaceholder } from "../monetization/PaywallPlaceholder";

type Item = {
  id: string;
  title: string;
  priceXp: number;
  cosmeticType: string;
  rarity: string;
  isPremium?: boolean;
};

export function ShopPaywallClient({ items }: { items: Item[] }) {
  const [paywallFor, setPaywallFor] = useState<string | null>(null);
  const tShop = useTranslations("shopPage");
  const tPaywall = useTranslations("paywall");
  const premiumTitle = items.find((i) => i.id === paywallFor)?.title ?? "Premium item";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            aria-label={tShop("shopItemLabel", { title: it.title })}
          >
            <p className="font-medium">
              {it.title}{" "}
              {it.isPremium ? (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                  {tShop("premium")}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-gray-500">
              {it.cosmeticType} · {it.rarity}
            </p>
            <p className="mt-2 text-sm font-semibold">{tShop("priceXp", { price: it.priceXp })}</p>
            {it.isPremium ? (
              <button
                onClick={() => setPaywallFor(it.id)}
                className="mt-2 rounded border px-3 py-1 text-xs"
                aria-label={tShop("ariaUnlock", { title: it.title })}
              >
                {tShop("unlockPremium")}
              </button>
            ) : (
              <form action="/api/shop/purchase" method="post">
                <input type="hidden" name="shopItemId" value={it.id} />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 mt-2 rounded px-3 py-1 text-xs text-white"
                  aria-label={tShop("ariaBuy", { title: it.title })}
                >
                  {tShop("buy")}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
      {paywallFor ? (
        <PaywallPlaceholder itemTitle={premiumTitle} onClose={() => setPaywallFor(null)} />
      ) : null}
    </>
  );
}
