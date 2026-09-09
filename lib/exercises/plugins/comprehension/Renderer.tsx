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
  const heroImage = prompt.imageUrl
    ? { url: prompt.imageUrl, alt: prompt.question }
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
      <div className="rounded bg-gray-50 p-4 text-sm leading-relaxed dark:bg-gray-900">
        {prompt.passage}
      </div>
      <p className="font-medium">{prompt.question}</p>
      <div className="space-y-2">
        {prompt.options.map((o) => (
          <label
            key={o}
            className={`flex cursor-pointer items-center gap-2 rounded border p-2 ${answer === o ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "bg-white dark:bg-gray-900"}`}
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
