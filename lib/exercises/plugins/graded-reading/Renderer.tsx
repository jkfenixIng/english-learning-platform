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
  const heroImage = prompt.imageUrl
    ? { url: prompt.imageUrl, alt: prompt.title }
    : prompt.images?.[0];

  return (
    <div className="space-y-4">
      {heroImage ? (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-gray-700">
          <div className="relative aspect-[16/9] w-full bg-gray-50 dark:bg-gray-800">
            <Image
              src={heroImage.url}
              alt={heroImage.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </div>
          {heroImage.caption ? (
            <p className="px-3 py-2 text-xs text-gray-500">{heroImage.caption}</p>
          ) : null}
        </div>
      ) : null}
      {prompt.images && prompt.images.length > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {prompt.images.slice(1, 3).map((img) => (
            <div
              key={img.url}
              className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-50"
            >
              <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="320px" />
            </div>
          ))}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold">{prompt.title}</h3>
      <div className="rounded bg-gray-50 p-4 text-sm leading-relaxed dark:bg-gray-900">
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
          <div key={q.id} className="rounded border p-3 dark:border-gray-700">
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
