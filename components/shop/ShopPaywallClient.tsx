"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PaywallPlaceholder } from "../monetization/PaywallPlaceholder";

type Item = {
  id: string;
  title: string;
  description?: string;
  priceXp: number;
  cosmeticType: string;
  rarity: string;
  assetUrl?: string | null;
  isPremium?: boolean;
};

const FALLBACK_ICON: Record<string, string> = {
  freeze: "❄️",
  avatar: "🎩",
  frame: "🖼️",
  theme: "🎨",
  boost: "⚡",
  pet: "🐾",
  title: "🏆",
  effect: "🎉",
};

export function ShopPaywallClient({ items, userXp = 0 }: { items: Item[]; userXp?: number }) {
  const [paywallFor, setPaywallFor] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const tShop = useTranslations("shopPage");
  const tPaywall = useTranslations("paywall");
  const premiumTitle = items.find((i) => i.id === paywallFor)?.title ?? "Premium item";

  async function handlePurchase(item: Item) {
    setError(null);
    setSuccess(null);
    if (item.isPremium) {
      setPaywallFor(item.id);
      return;
    }
    if (userXp < item.priceXp) {
      setError(tShop("insufficientXp"));
      return;
    }
    setLoadingId(item.id);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shopItemId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? tShop("purchaseFailed");
        // Map known status codes to i18n if needed, but show raw msg with role alert
        setError(msg);
        return;
      }
      setSuccess(tShop("purchaseSuccess", { title: item.title }));
      // Optionally could refresh or update UI — show toast and clear error
    } catch (e) {
      setError(e instanceof Error ? e.message : tShop("purchaseFailed"));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
        >
          {success}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const insufficient = !it.isPremium && userXp < it.priceXp;
          const isLoading = loadingId === it.id;
          return (
            <div
              key={it.id}
              className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              aria-label={tShop("shopItemLabel", { title: it.title })}
            >
              <div className="flex items-start gap-3">
                {it.assetUrl ? (
                  <Image
                    src={it.assetUrl}
                    width={80}
                    height={80}
                    alt={it.title}
                    unoptimized
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-3xl dark:bg-slate-800">
                    <span aria-hidden>{FALLBACK_ICON[it.cosmeticType] ?? "🛒"}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
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
                  <p className="mt-2 text-sm font-semibold">
                    {tShop("priceXp", { price: it.priceXp })}
                  </p>
                  {it.isPremium ? (
                    <button
                      onClick={() => setPaywallFor(it.id)}
                      className="mt-2 rounded border px-3 py-1 text-xs"
                      aria-label={tShop("ariaUnlock", { title: it.title })}
                    >
                      {tShop("unlockPremium")}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(it)}
                      disabled={insufficient || isLoading}
                      className="bg-primary hover:bg-primary/90 mt-2 rounded px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={tShop("ariaBuy", { title: it.title })}
                    >
                      {isLoading
                        ? tShop("buying")
                        : insufficient
                          ? tShop("insufficientXp")
                          : tShop("buy")}
                    </button>
                  )}
                  {insufficient ? (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      {tShop("insufficientXp")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {paywallFor ? (
        <PaywallPlaceholder itemTitle={premiumTitle} onClose={() => setPaywallFor(null)} />
      ) : null}
    </>
  );
}
