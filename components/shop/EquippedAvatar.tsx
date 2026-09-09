"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Inv = {
  shopItemId: string;
  equipped?: boolean;
  shopItem?: { cosmeticType: string; assetUrl?: string | null; title: string };
  // fallback raw query shape
  title?: string;
  cosmeticType?: string;
  assetUrl?: string | null;
};

export function EquippedAvatar({ initial }: { initial?: string | undefined }) {
  const [frame, setFrame] = useState<string | null>(null);
  const [avatarOverlay, setAvatarOverlay] = useState<string | null>(null);
  const displayInitial = (initial?.trim()?.[0] ?? "E").toUpperCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shop/inventory", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { inventory: Inv[] };
        const list = data.inventory ?? [];
        const equipped = list.filter(
          (i) =>
            (i as unknown as { equipped: boolean }).equipped === true ||
            (i.shopItem && (i as unknown as { equipped: boolean }).equipped),
        );
        // Also fallback: if no equipped column yet, treat empty
        for (const inv of list as unknown as (Inv & {
          shopItem: { cosmeticType: string; assetUrl: string | null };
        })[]) {
          const si =
            inv.shopItem ??
            (inv as unknown as { cosmeticType: string; assetUrl: string; title: string });
          const isEquipped = (inv as unknown as { equipped?: boolean }).equipped;
          if (!isEquipped) continue;
          const ct = si.cosmeticType ?? si?.cosmeticType;
          const url = si.assetUrl ?? si?.assetUrl;
          if (ct === "frame" && url) setFrame(url);
          if ((ct === "avatar" || ct === "pet") && url) setAvatarOverlay(url);
        }
        // If API returned equipped but shopItem is nested, handle above
        // Also check raw shape where equipped flag present
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
      <span aria-hidden>{displayInitial}</span>
      {avatarOverlay ? (
        <Image
          src={avatarOverlay}
          alt=""
          width={24}
          height={24}
          unoptimized
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full border border-white object-cover shadow-sm dark:border-slate-800"
        />
      ) : null}
      {frame ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-400/80 ring-offset-1 dark:ring-amber-300/70"
          style={{
            boxShadow: "0 0 0 2px rgba(251,191,36,0.5)",
          }}
        />
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
            // also set data-theme directly for immediate visual
            document.documentElement.dataset.theme = theme;
            const isDark = ["midnight", "aurora", "dark"].includes(theme);
            document.documentElement.classList.toggle("dark", isDark);
          }
        }
      } catch {}
    })();
  }, []);
  return null;
}
