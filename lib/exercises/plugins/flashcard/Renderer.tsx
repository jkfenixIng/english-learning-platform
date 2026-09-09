"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { FlashcardPrompt, FlashcardAnswer } from "./schema";

const FALLBACK_FLASHCARD = "/lesson-images/teaching-placeholder.png";

function resolveAlt(prompt: FlashcardPrompt, fallbackAlt?: string): string {
  const base = prompt.front?.trim() || fallbackAlt || "Flashcard illustration";
  // richer alt for a11y: front + context
  return `${base} — flashcard image`;
}

export function FlashcardRenderer({
  prompt,
  onSubmit,
}: {
  prompt: FlashcardPrompt;
  onSubmit: (a: FlashcardAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState("");
  const [imgError, setImgError] = useState(false);

  const primaryImage = prompt.imageUrl
    ? { url: prompt.imageUrl, alt: resolveAlt(prompt) }
    : prompt.images?.[0]
      ? { url: prompt.images[0].url, alt: prompt.images[0].alt || resolveAlt(prompt) }
      : null;

  const displayImage =
    primaryImage && !imgError ? primaryImage : { url: FALLBACK_FLASHCARD, alt: resolveAlt(prompt) };
  const hasImage = !!primaryImage || true; // always show fallback for visual consistency

  return (
    <div className="space-y-4">
      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-6 text-center shadow transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      >
        {hasImage ? (
          <div className="relative mx-auto mb-3 h-32 w-full max-w-[240px] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800">
            <Image
              src={displayImage.url}
              alt={displayImage.alt}
              fill
              className="object-contain"
              sizes="240px"
              onError={() => setImgError(true)}
              unoptimized={displayImage.url.includes("picsum.photos")}
            />
          </div>
        ) : null}
        {prompt.images && prompt.images.length > 1 ? (
          <div className="mb-3 flex justify-center gap-2">
            {prompt.images.slice(1, 3).map((img) => (
              <div
                key={img.url}
                className="relative h-16 w-16 overflow-hidden rounded bg-slate-50 dark:bg-slate-800"
              >
                <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="64px" />
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-lg font-semibold">{flipped ? prompt.back : prompt.front}</p>
        <p className="mt-2 text-xs text-gray-500">{flipped ? t("flipBack") : t("revealing")}</p>
      </div>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={t("typeTranslationPlaceholder")}
        className="focus-visible:ring-primary-500 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="flex gap-2">
        <button
          data-exercise-submit
          onClick={() => onSubmit({ revealed: true, typed: typed || undefined })}
          className="bg-primary rounded px-4 py-2 text-white"
        >
          {t("reviewed")}
        </button>
        <button
          onClick={() => setFlipped(!flipped)}
          className="rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          {flipped ? t("hide") : t("reveal")}
        </button>
      </div>
    </div>
  );
}
