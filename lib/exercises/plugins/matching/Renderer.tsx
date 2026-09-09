"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { MatchingPrompt, MatchingAnswer } from "./schema";

export function MatchingRenderer({
  prompt,
  onSubmit,
}: {
  prompt: MatchingPrompt;
  onSubmit: (a: MatchingAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [heroError, setHeroError] = useState(false);
  const rights = prompt.pairs.map((p) => p.right);
  const handleLeft = (l: string) => setLeftSel(l);
  const handleRight = (r: string) => {
    if (leftSel) {
      setMatches((m) => ({ ...m, [leftSel]: r }));
      setLeftSel(null);
    }
  };
  const rawHero = prompt.imageUrl
    ? { url: prompt.imageUrl, alt: t("matchingAlt") }
    : (prompt.images?.[0] ?? null);
  const heroImage: { url: string; alt: string; caption?: string | undefined } =
    rawHero && !heroError
      ? (rawHero as { url: string; alt: string; caption?: string | undefined })
      : {
          url: "/lesson-images/teaching-placeholder.png",
          alt: `${t("matchingAlt")} — illustration`,
        };
  const hasRealHero = !!rawHero && !heroError;
  const needsUnoptimized = heroImage.url.includes("picsum.photos");

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="relative aspect-[16/9] w-full bg-slate-50 dark:bg-slate-800">
          <Image
            src={heroImage.url}
            alt={heroImage.alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            onError={() => setHeroError(true)}
            unoptimized={needsUnoptimized}
          />
        </div>
        {heroImage.caption ? (
          <p className="px-3 py-2 text-xs text-gray-500">{heroImage.caption}</p>
        ) : !hasRealHero ? (
          <p className="px-3 py-2 text-xs text-gray-400">Illustrative image</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {prompt.pairs.map((p) => (
            <button
              key={p.id}
              onClick={() => handleLeft(p.left)}
              className={`w-full rounded border p-2 text-left text-sm ${leftSel === p.left ? "border-indigo-400 bg-indigo-100 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-100" : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"} ${matches[p.left] ? "opacity-60" : ""}`}
            >
              {p.left} {matches[p.left] ? `→ ${matches[p.left]}` : ""}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rights.map((r) => (
            <button
              key={r}
              onClick={() => handleRight(r)}
              className="w-full rounded border border-slate-200 bg-white p-2 text-left text-sm text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit({ matches })}
          className="bg-primary rounded px-4 py-2 text-white"
        >
          {t("submit")}
        </button>
        <button onClick={() => setMatches({})} className="ml-2 rounded border px-4 py-2 text-sm">
          {t("clear")}
        </button>
      </div>
    </div>
  );
}
