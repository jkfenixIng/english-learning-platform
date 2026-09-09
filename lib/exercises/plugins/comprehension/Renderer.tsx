"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ComprehensionPrompt, ComprehensionAnswer } from "./schema";

export function ComprehensionRenderer({
  prompt,
  onSubmit,
}: {
  prompt: ComprehensionPrompt;
  onSubmit: (a: ComprehensionAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [answer, setAnswer] = useState("");
  const [heroError, setHeroError] = useState(false);
  const rawHero = prompt.imageUrl
    ? { url: prompt.imageUrl, alt: prompt.question }
    : (prompt.images?.[0] ?? null);
  const heroImage: { url: string; alt: string; caption?: string | undefined } =
    rawHero && !heroError
      ? (rawHero as { url: string; alt: string; caption?: string | undefined })
      : {
          url: "/lesson-images/teaching-placeholder.png",
          alt: `${prompt.question} — illustration`,
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
      <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        {prompt.passage}
      </div>
      <p className="font-medium">{prompt.question}</p>
      <div className="space-y-2">
        {prompt.options.map((o) => (
          <label
            key={o}
            className={`flex cursor-pointer items-center gap-2 rounded border p-2 ${answer === o ? "border-indigo-500 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100" : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}
          >
            <input
              type="radio"
              name="comp"
              value={o}
              checked={answer === o}
              onChange={() => setAnswer(o)}
            />
            {o}
          </label>
        ))}
      </div>
      <button
        onClick={() => onSubmit({ answer })}
        className="bg-primary rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
