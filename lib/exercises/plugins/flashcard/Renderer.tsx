"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { FlashcardPrompt, FlashcardAnswer } from "./schema";

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

  const primaryImage = prompt.imageUrl
    ? { url: prompt.imageUrl, alt: prompt.front }
    : prompt.images?.[0];

  return (
    <div className="space-y-4">
      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer rounded-xl border bg-white p-6 text-center shadow transition hover:shadow-md dark:bg-gray-900"
      >
        {primaryImage ? (
          <div className="relative mx-auto mb-3 h-32 w-full max-w-[240px] overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800">
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt}
              fill
              className="object-contain"
              sizes="240px"
            />
          </div>
        ) : null}
        {prompt.images && prompt.images.length > 1 ? (
          <div className="mb-3 flex justify-center gap-2">
            {prompt.images.slice(1, 3).map((img) => (
              <div key={img.url} className="relative h-16 w-16 overflow-hidden rounded bg-gray-50">
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
        className="w-full rounded border px-3 py-2 dark:bg-gray-900"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit({ revealed: true, typed: typed || undefined })}
          className="bg-primary rounded px-4 py-2 text-white"
        >
          {t("reviewed")}
        </button>
        <button onClick={() => setFlipped(!flipped)} className="rounded border px-4 py-2">
          {flipped ? t("hide") : t("reveal")}
        </button>
      </div>
    </div>
  );
}
