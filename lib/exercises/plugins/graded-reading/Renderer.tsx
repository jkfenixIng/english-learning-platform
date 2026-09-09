"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { GradedReadingPrompt, GradedReadingAnswer } from "./schema";

export function GradedReadingRenderer({
  prompt,
  onSubmit,
}: {
  prompt: GradedReadingPrompt;
  onSubmit: (a: GradedReadingAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [heroError, setHeroError] = useState(false);
  const rawHero = prompt.imageUrl
    ? { url: prompt.imageUrl, alt: prompt.title || "Reading illustration" }
    : (prompt.images?.[0] ?? null);
  // fallback local if missing or picsum failure
  const heroImage: { url: string; alt: string; caption?: string | undefined } =
    rawHero && !heroError
      ? (rawHero as { url: string; alt: string; caption?: string | undefined })
      : {
          url: "/lesson-images/teaching-placeholder.png",
          alt: `${prompt.title} — illustration`,
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
      {prompt.images && prompt.images.length > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {prompt.images.slice(1, 3).map((img) => (
            <div
              key={img.url}
              className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
            >
              <Image
                src={img.url}
                alt={img.alt || `${prompt.title} detail`}
                fill
                className="object-cover"
                sizes="320px"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                unoptimized={img.url.includes("picsum.photos")}
              />
            </div>
          ))}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold">{prompt.title}</h3>
      <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        {prompt.passage}
      </div>
      {prompt.vocab?.length ? (
        <div className="flex flex-wrap gap-2">
          {prompt.vocab.map((v) => (
            <span
              key={v.word}
              className="rounded bg-amber-100 px-2 py-1 text-xs"
              title={v.definition}
            >
              <strong>{v.word}</strong>: {v.definition}
            </span>
          ))}
        </div>
      ) : null}
      <div className="space-y-3">
        {prompt.questions.map((q) => (
          <div
            key={q.id}
            className="rounded border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="mb-2 text-sm font-medium">{q.question}</p>
            <div className="space-y-1">
              {q.options.map((o) => (
                <label key={o} className="flex gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === o}
                    onChange={() => setAnswers((p) => ({ ...p, [q.id]: o }))}
                  />
                  {o}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onSubmit({ answers })}
        className="bg-primary rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
