"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PaywallPlaceholder } from "../monetization/PaywallPlaceholder";
import { usePreferencesStore } from "../../lib/stores/preferences";
import { ShopPreview } from "./ShopPreview";

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

type InventoryItem = {
  shopItemId: string;
  equipped?: boolean;
  purchasedAt?: string | Date;
  shopItem: Item;
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
  background: "🏞️",
  bundle: "🎁",
};

function themeFromTitle(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("ocean")) return "ocean";
  if (t.includes("midnight")) return "midnight";
  if (t.includes("forest")) return "forest";
  if (t.includes("sunset")) return "sunset";
  if (t.includes("aurora")) return "aurora";
  return null;
}

export function ShopPaywallClient({
  items,
  userXp = 0,
  userCoins,
  initialInventory = [],
}: {
  items: Item[];
  userXp?: number;
  userCoins?: number;
  initialInventory?: InventoryItem[];
}) {
  const coins = userCoins ?? userXp;
  const [paywallFor, setPaywallFor] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [equipLoading, setEquipLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const tShop = useTranslations("shopPage");
  const tPaywall = useTranslations("paywall");
  const premiumTitle = items.find((i) => i.id === paywallFor)?.title ?? "Premium item";
  const setTheme = usePreferencesStore((s) => s.setTheme);

  const ownedIds = new Set(inventory.map((i) => i.shopItemId));
  const equippedIds = new Set(inventory.filter((i) => i.equipped).map((i) => i.shopItemId));

  const refreshInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/shop/inventory", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { inventory: InventoryItem[] };
      if (Array.isArray(data.inventory)) setInventory(data.inventory);
    } catch {}
  }, []);

  useEffect(() => {
    setInventory(initialInventory);
  }, [initialInventory]);

  async function handlePurchase(item: Item) {
    setError(null);
    setSuccess(null);
    if (item.isPremium) {
      setPaywallFor(item.id);
      return;
    }
    if (coins < item.priceXp) {
      setError(
        tShop.has("insufficientCoins")
          ? tShop("insufficientCoins")
          : "Not enough coins — earn XP to get coins",
      );
      return;
    }
    if (ownedIds.has(item.id)) {
      setError(tShop("owned"));
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
        setError(msg);
        return;
      }
      setSuccess(tShop("purchaseSuccess", { title: item.title }));
      await refreshInventory();
    } catch (e) {
      setError(e instanceof Error ? e.message : tShop("purchaseFailed"));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleEquip(itemId: string, shouldEquip: boolean) {
    setError(null);
    setSuccess(null);
    setEquipLoading(itemId);
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shopItemId: itemId, equipped: shouldEquip }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? tShop("purchaseFailed"));
        return;
      }
      await refreshInventory();
      // Theme sync: if theme equipped/unequipped, update store & DOM
      const invItem =
        inventory.find((i) => i.shopItemId === itemId)?.shopItem ??
        items.find((i) => i.id === itemId);
      if (invItem?.cosmeticType === "theme") {
        const themeVal = themeFromTitle(invItem.title);
        if (themeVal) {
          if (shouldEquip) {
            setTheme(themeVal as never);
            document.documentElement.dataset.theme = themeVal;
            const isDark = ["midnight", "aurora", "dark"].includes(themeVal);
            document.documentElement.classList.toggle("dark", isDark);
            setSuccess(`Tema cambiado a ${invItem.title} — ${themeVal}`);
            window.dispatchEvent(
              new CustomEvent("shop:theme", { detail: { theme: themeVal, title: invItem.title } }),
            );
          } else {
            setTheme("light" as never);
            document.documentElement.removeAttribute("data-theme");
            document.documentElement.classList.remove("dark");
            setSuccess("Tema restablecido a claro");
          }
        }
      } else if (invItem?.cosmeticType === "freeze") {
        setSuccess(
          "🧊 Streak Freeze activado — protegerá tu racha 1 día si olvidas practicar (se consume automáticamente).",
        );
      } else if (shouldEquip) {
        setSuccess(tShop("purchaseSuccess", { title: `${invItem?.title ?? itemId} equipped` }));
        window.dispatchEvent(
          new CustomEvent("shop:equip", {
            detail: { itemId, cosmeticType: invItem?.cosmeticType },
          }),
        );
      } else {
        // unequip success
        window.dispatchEvent(
          new CustomEvent("shop:equip", {
            detail: { itemId, cosmeticType: invItem?.cosmeticType },
          }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tShop("purchaseFailed"));
    } finally {
      setEquipLoading(null);
    }
  }

  // Inventory derived: include shopItem for preview
  const inventoryWithPreview = inventory.filter((i) => i.shopItem);

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

      {/* Balances visible in client too */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border bg-amber-50 px-2.5 py-1 font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⭐ XP {userXp}
        </span>
        <span className="rounded-full border bg-sky-50 px-2.5 py-1 font-medium text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
          🪙 Monedas {coins}
        </span>
      </div>

      {/* Shop grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const insufficient = !it.isPremium && coins < it.priceXp;
          const isFreeze = it.cosmeticType === "freeze";
          const isLoading = loadingId === it.id;
          const isOwned = ownedIds.has(it.id);
          const isEquipped = equippedIds.has(it.id);
          const isEquipLoading = equipLoading === it.id;
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
                    {isOwned ? (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                        {tShop("owned")}
                      </span>
                    ) : null}
                    {isEquipped ? (
                      <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700 dark:bg-violet-900 dark:text-violet-200">
                        Equipped
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-500">
                    {it.cosmeticType} · {it.rarity}
                    {isFreeze ? (
                      <span
                        className="ml-1 inline-flex items-center gap-1 rounded bg-sky-100 px-1 py-0.5 text-[10px] text-sky-700 dark:bg-sky-900 dark:text-sky-200"
                        title="Protege tu racha 1 día si olvidas practicar — se consume automáticamente al fallar un día"
                      >
                        🧊 <span>Streak Freeze</span>
                        <span aria-hidden title="Se consume automáticamente si fallas 1 día">
                          ❓
                        </span>
                      </span>
                    ) : null}
                  </p>
                  {isFreeze ? (
                    <p className="mt-1 text-xs leading-snug text-sky-700 dark:text-sky-300">
                      Protege tu racha 1 día si olvidas practicar — se consume automáticamente al
                      fallar un día
                    </p>
                  ) : null}
                  {it.description ? (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {it.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm font-semibold">
                    <span aria-hidden>🪙</span> {it.priceXp} monedas
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      · XP no se gasta
                    </span>
                  </p>
                  {it.isPremium ? (
                    <button
                      onClick={() => setPaywallFor(it.id)}
                      className="mt-2 rounded border px-3 py-1 text-xs"
                      aria-label={tShop("ariaUnlock", { title: it.title })}
                    >
                      {tShop("unlockPremium")}
                    </button>
                  ) : isOwned ? (
                    <button
                      onClick={() => handleEquip(it.id, !isEquipped)}
                      disabled={isEquipLoading}
                      className={`mt-2 rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                        isEquipped
                          ? "border bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          : "bg-violet-600 text-white hover:bg-violet-700"
                      }`}
                      aria-label={isEquipped ? `Unequip ${it.title}` : `Equip ${it.title}`}
                    >
                      {isEquipLoading ? "..." : isEquipped ? "Unequip" : "Equip"}
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
                  {insufficient && !isOwned ? (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      {tShop.has("insufficientCoins")
                        ? tShop("insufficientCoins")
                        : "Not enough coins"}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview mini */}
      <div className="mt-6">
        <ShopPreview equipped={inventory.filter((i) => i.equipped).map((i) => i.shopItem)} />
      </div>

      {/* Inventory section */}
      <div className="mt-6 rounded-xl border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Inventory</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your purchased items — equip to see avatar & theme changes.
        </p>
        {inventoryWithPreview.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed bg-white px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No items yet. Buy something to see it here.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {inventoryWithPreview.map((inv) => {
              const it = inv.shopItem;
              const isEquipped = !!inv.equipped;
              const isEquipLoading = equipLoading === it.id;
              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-3 rounded-lg border bg-white p-3 dark:border-slate-700 dark:bg-slate-800 ${
                    isEquipped ? "ring-1 ring-violet-400 dark:ring-violet-600" : ""
                  }`}
                >
                  {it.assetUrl ? (
                    <Image
                      src={it.assetUrl}
                      width={48}
                      height={48}
                      alt={it.title}
                      unoptimized
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-xl dark:bg-slate-700">
                      <span aria-hidden>{FALLBACK_ICON[it.cosmeticType] ?? "🛒"}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {it.title}
                      {isEquipped ? (
                        <span className="ml-2 text-xs text-violet-600 dark:text-violet-300">
                          ● equipped
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {it.cosmeticType} · {it.rarity}
                    </p>
                    {/* Theme preview bar */}
                    {it.cosmeticType === "theme" ? (
                      <div
                        className="mt-1 h-2 w-full rounded-full border"
                        style={{
                          background:
                            themeFromTitle(it.title) === "ocean"
                              ? "linear-gradient(90deg,#0ea5e9,#22d3ee)"
                              : themeFromTitle(it.title) === "midnight"
                                ? "linear-gradient(90deg,#0f172a,#334155)"
                                : themeFromTitle(it.title) === "forest"
                                  ? "linear-gradient(90deg,#16a34a,#86efac)"
                                  : themeFromTitle(it.title) === "sunset"
                                    ? "linear-gradient(90deg,#f97316,#fde68a)"
                                    : themeFromTitle(it.title) === "aurora"
                                      ? "linear-gradient(90deg,#7c3aed,#ec4899)"
                                      : "#e2e8f0",
                        }}
                        aria-hidden
                      />
                    ) : null}
                    {/* Avatar frame preview */}
                    {it.cosmeticType === "frame" ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                          E
                          <span
                            className="absolute inset-0 rounded-full ring-2 ring-amber-400"
                            aria-hidden
                          />
                        </span>
                        <span className="text-[11px] text-slate-500">frame preview</span>
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleEquip(it.id, !isEquipped)}
                    disabled={isEquipLoading}
                    className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                      isEquipped
                        ? "border bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {isEquipLoading ? "..." : isEquipped ? "Unequip" : "Equip"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {paywallFor ? (
        <PaywallPlaceholder itemTitle={premiumTitle} onClose={() => setPaywallFor(null)} />
      ) : null}
    </>
  );
}
