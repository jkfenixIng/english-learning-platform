"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Inv = {
  shopItemId: string;
  equipped?: boolean;
  shopItem?: { cosmeticType: string; assetUrl?: string | null; title: string };
  title?: string;
  cosmeticType?: string;
  assetUrl?: string | null;
};

type EquippedState = {
  frame: string | null;
  hat: string | null;
  glasses: string | null;
  cape: string | null;
  pet: string | null;
  petTitle: string | null;
  background: string | null;
  effect: string | null;
  theme: string | null;
};

function getEquippedState(list: Inv[]): EquippedState {
  const state: EquippedState = {
    frame: null,
    hat: null,
    glasses: null,
    cape: null,
    pet: null,
    petTitle: null,
    background: null,
    effect: null,
    theme: null,
  };
  for (const inv of list as unknown as (Inv & {
    shopItem: { cosmeticType: string; assetUrl: string | null; title: string };
  })[]) {
    const si =
      inv.shopItem ?? (inv as unknown as { cosmeticType: string; assetUrl: string; title: string });
    const isEquipped = (inv as unknown as { equipped?: boolean }).equipped;
    if (!isEquipped) continue;
    const ct = si.cosmeticType ?? si?.cosmeticType;
    const url = si.assetUrl ?? si?.assetUrl;
    const title = si.title ?? "";
    const tLow = title.toLowerCase();
    if (ct === "frame" && url) state.frame = url;
    if (ct === "avatar" && url) {
      if (tLow.includes("hat")) state.hat = url;
      else if (tLow.includes("glasses")) state.glasses = url;
      else if (tLow.includes("cape")) state.cape = url;
      else state.hat = url; // fallback avatar -> hat slot
    }
    if (ct === "pet" && url) {
      state.pet = url;
      state.petTitle = title;
    }
    if (ct === "background" && url) state.background = url;
    if (ct === "effect" && url) state.effect = url;
    if (ct === "theme") state.theme = title;
  }
  return state;
}

export function EquippedAvatar({ initial }: { initial?: string | undefined }) {
  const [eq, setEq] = useState<EquippedState>({
    frame: null,
    hat: null,
    glasses: null,
    cape: null,
    pet: null,
    petTitle: null,
    background: null,
    effect: null,
    theme: null,
  });
  const displayInitial = (initial?.trim()?.[0] ?? "E").toUpperCase();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/shop/inventory", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { inventory: Inv[] };
        const list = data.inventory ?? [];
        if (cancelled) return;
        setEq(getEquippedState(list));
      } catch {}
    }
    load();
    const onEquip = () => load();
    window.addEventListener("shop:equip", onEquip);
    window.addEventListener("shop:theme", onEquip);
    return () => {
      cancelled = true;
      window.removeEventListener("shop:equip", onEquip);
      window.removeEventListener("shop:theme", onEquip);
    };
  }, []);

  const hasAvatarOverlay = eq.hat || eq.glasses || eq.cape;
  const hasFrame = !!eq.frame;
  const hasPet = !!eq.pet;

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Avatar core with layered cosméticos */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
        {/* Background behind avatar */}
        {eq.background ? (
          <Image
            src={eq.background}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="absolute inset-0 h-full w-full rounded-full object-cover opacity-40"
          />
        ) : null}
        <span aria-hidden className="relative z-[1]">
          {displayInitial}
        </span>

        {/* Hat on top */}
        {eq.hat ? (
          <Image
            src={eq.hat}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="pointer-events-none absolute -top-2 left-1/2 z-[2] h-6 w-7 -translate-x-1/2 object-contain drop-shadow-sm"
          />
        ) : null}
        {/* Glasses centered */}
        {eq.glasses ? (
          <Image
            src={eq.glasses}
            alt=""
            width={22}
            height={10}
            unoptimized
            className="pointer-events-none absolute top-[42%] left-1/2 z-[2] h-2.5 w-5 -translate-x-1/2 object-contain"
          />
        ) : null}
        {/* Cape flowing behind */}
        {eq.cape ? (
          <Image
            src={eq.cape}
            alt=""
            width={20}
            height={24}
            unoptimized
            className="pointer-events-none absolute -right-1 -bottom-1 z-[0] h-6 w-5 object-contain opacity-90"
          />
        ) : null}

        {/* Frame overlay - tinted ring + image border fallback */}
        {hasFrame ? (
          <>
            {eq.frame?.startsWith("/") ? (
              <Image
                src={eq.frame}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="pointer-events-none absolute inset-0 h-full w-full rounded-full object-cover"
              />
            ) : null}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-400/80 ring-offset-1 dark:ring-amber-300/70"
              style={{ boxShadow: "0 0 0 2px rgba(251,191,36,0.45)" }}
            />
          </>
        ) : null}

        {/* Effect sparkle */}
        {eq.effect ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-1 -right-1 z-[3] text-[10px]"
          >
            ✨
          </span>
        ) : null}
      </div>

      {/* Pet badge al lado / debajo */}
      {hasPet ? (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-50 shadow-sm dark:border-violet-800 dark:bg-violet-950"
          title={eq.petTitle ?? "Pet"}
        >
          {eq.pet ? (
            <Image
              src={eq.pet}
              alt={eq.petTitle ?? "Pet"}
              width={20}
              height={20}
              unoptimized
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : (
            <span aria-hidden className="text-sm">
              🐾
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ThemeSync() {
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/shop/inventory", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          inventory: { equipped?: boolean; shopItem?: { cosmeticType: string; title: string } }[];
        };
        const eq = data.inventory?.find((i) => i.equipped && i.shopItem?.cosmeticType === "theme");
        if (eq?.shopItem?.title) {
          const t = eq.shopItem.title.toLowerCase();
          let theme: string | null = null;
          if (t.includes("ocean")) theme = "ocean";
          else if (t.includes("midnight")) theme = "midnight";
          else if (t.includes("forest")) theme = "forest";
          else if (t.includes("sunset")) theme = "sunset";
          else if (t.includes("aurora")) theme = "aurora";
          if (theme) {
            const { usePreferencesStore } = await import("../../lib/stores/preferences");
            const current = usePreferencesStore.getState().theme;
            if (current !== theme) usePreferencesStore.getState().setTheme(theme as never);
            document.documentElement.dataset.theme = theme;
            const isDark = ["midnight", "aurora", "dark"].includes(theme);
            document.documentElement.classList.toggle("dark", isDark);
          }
        }
      } catch {}
    })();

    // Listen for theme changes from ShopPaywallClient for instant feedback
    const onTheme = (e: Event) => {
      const detail = (e as CustomEvent).detail as { theme: string; title: string } | undefined;
      if (!detail?.theme) return;
      // Already applied in ShopPaywallClient, but ensure toast
      const el = document.createElement("div");
      el.textContent = `Tema cambiado a ${detail.title ?? detail.theme}`;
      el.className =
        "fixed bottom-4 right-4 z-50 rounded-lg border bg-white px-4 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-white";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    };
    window.addEventListener("shop:theme", onTheme as EventListener);
    return () => window.removeEventListener("shop:theme", onTheme as EventListener);
  }, []);
  return null;
}
