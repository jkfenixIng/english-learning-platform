"use client";
import Image from "next/image";

type PreviewItem = {
  id: string;
  title: string;
  cosmeticType: string;
  assetUrl?: string | null;
};

export function ShopPreview({ equipped, initial }: { equipped: PreviewItem[]; initial?: string }) {
  const frame = equipped.find((i) => i.cosmeticType === "frame");
  const hats = equipped.filter((i) => i.cosmeticType === "avatar");
  const hat = hats.find((i) => i.title.toLowerCase().includes("hat")) ?? hats[0];
  const glasses = hats.find((i) => i.title.toLowerCase().includes("glasses"));
  const cape = hats.find((i) => i.title.toLowerCase().includes("cape"));
  const pet = equipped.find((i) => i.cosmeticType === "pet");
  const theme = equipped.find((i) => i.cosmeticType === "theme");
  const bg = equipped.find((i) => i.cosmeticType === "background");
  const displayInitial = (initial?.trim()?.[0] ?? "E").toUpperCase();

  return (
    <div className="rounded-xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Vista previa</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Cómo queda tu avatar con lo equipado
      </p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-visible rounded-full bg-slate-50 text-lg font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
          {bg?.assetUrl ? (
            <Image
              src={bg.assetUrl}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="absolute inset-0 h-full w-full rounded-full object-cover opacity-50"
            />
          ) : null}
          <span className="relative z-[1]">{displayInitial}</span>
          {hat?.assetUrl ? (
            <Image
              src={hat.assetUrl}
              alt={hat.title}
              width={40}
              height={40}
              unoptimized
              className="pointer-events-none absolute -top-2 left-1/2 z-[2] h-7 w-9 -translate-x-1/2 object-contain drop-shadow"
            />
          ) : null}
          {glasses?.assetUrl ? (
            <Image
              src={glasses.assetUrl}
              alt={glasses.title}
              width={28}
              height={12}
              unoptimized
              className="pointer-events-none absolute top-[42%] left-1/2 z-[2] h-3 w-6 -translate-x-1/2 object-contain"
            />
          ) : null}
          {cape?.assetUrl ? (
            <Image
              src={cape.assetUrl}
              alt={cape.title}
              width={24}
              height={28}
              unoptimized
              className="pointer-events-none absolute -right-1 -bottom-1 z-[0] h-7 w-6 object-contain opacity-90"
            />
          ) : null}
          {frame?.assetUrl ? (
            <Image
              src={frame.assetUrl}
              alt={frame.title}
              width={64}
              height={64}
              unoptimized
              className="pointer-events-none absolute inset-0 h-full w-full rounded-full object-cover"
            />
          ) : null}
          {frame ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-400/80 ring-offset-1 dark:ring-amber-300/70"
              style={{ boxShadow: "0 0 0 2px rgba(251,191,36,0.45)" }}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Avatar {theme ? `· ${theme.title}` : ""}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {equipped.length === 0
              ? "Sin cosméticos equipados"
              : equipped.map((e) => e.title).join(" · ")}
          </p>
          {theme ? (
            <span className="mt-1 inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {theme.title} equipado
            </span>
          ) : null}
        </div>
        {pet?.assetUrl ? (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950"
            title={pet.title}
          >
            <Image
              src={pet.assetUrl}
              alt={pet.title}
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 rounded-full object-cover"
            />
          </div>
        ) : pet ? (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-lg dark:bg-violet-950"
            title={pet.title}
          >
            🐾
          </div>
        ) : null}
      </div>
      {theme ? (
        <div
          className="mt-3 h-2 w-full rounded-full border"
          style={{
            background: theme.title.toLowerCase().includes("ocean")
              ? "linear-gradient(90deg,#0ea5e9,#22d3ee)"
              : theme.title.toLowerCase().includes("midnight")
                ? "linear-gradient(90deg,#0f172a,#334155)"
                : theme.title.toLowerCase().includes("forest")
                  ? "linear-gradient(90deg,#16a34a,#86efac)"
                  : theme.title.toLowerCase().includes("sunset")
                    ? "linear-gradient(90deg,#f97316,#fde68a)"
                    : theme.title.toLowerCase().includes("aurora")
                      ? "linear-gradient(90deg,#7c3aed,#ec4899)"
                      : "#e2e8f0",
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
