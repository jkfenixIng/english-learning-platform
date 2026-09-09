"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

const TYPES = [
  "fill_blanks",
  "ordering",
  "transformation",
  "flashcard",
  "matching",
  "listening_tts",
  "dictation",
  "comprehension",
  "graded_reading",
  "writing_prompt",
  "speaking_record",
  "shadowing",
  "pronunciation",
] as const;

type ImageAsset = { url: string; alt: string; caption?: string };

export function ExerciseEditor({ lessonId }: { lessonId?: string }) {
  const t = useTranslations("adminEditor");
  const [type, setType] = useState<(typeof TYPES)[number]>("fill_blanks");
  const [prompt, setPrompt] = useState<string>(JSON.stringify({ text: "Example prompt" }, null, 2));
  const [solution, setSolution] = useState<string>(JSON.stringify({ answer: "example" }, null, 2));
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [draftUrl, setDraftUrl] = useState("");
  const [draftAlt, setDraftAlt] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [msg, setMsg] = useState<string>("");

  const addImage = () => {
    if (!draftUrl.trim() || !draftAlt.trim()) {
      setMsg(t("imageRequires"));
      return;
    }
    const caption = draftCaption.trim();
    const next: ImageAsset = caption
      ? { url: draftUrl.trim(), alt: draftAlt.trim(), caption }
      : { url: draftUrl.trim(), alt: draftAlt.trim() };
    setImages((prev) => [...prev, next]);
    setDraftUrl("");
    setDraftAlt("");
    setDraftCaption("");
    setMsg("");
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setMsg(t("submitting"));
    try {
      const assets = images.length ? { images } : undefined;
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lessonId ?? "00000000-0000-0000-0000-000000000000",
          type,
          difficulty: 3,
          prompt: JSON.parse(prompt),
          solution: JSON.parse(solution),
          ...(assets ? { assets } : {}),
        }),
      });
      const data = await res.json();
      setMsg(res.ok ? t("savedPrefix") + data.id : t("errorPrefix") + JSON.stringify(data.error));
    } catch (e) {
      setMsg(t("errorPrefix") + String(e));
    }
  };

  return (
    <div className="rounded border p-4 dark:border-gray-700" aria-label={t("editorAria")}>
      <h3 className="font-semibold">{t("title")}</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          {t("typeLabel")}
          <select
            value={type}
            onChange={(e) => setType(e.target.value as never)}
            className="w-full rounded border px-2 py-1"
            aria-label={t("typeAria")}
          >
            {TYPES.map((typeVal) => (
              <option key={typeVal} value={typeVal}>
                {typeVal}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          {t("lessonId")}
          <input
            value={lessonId ?? ""}
            readOnly
            placeholder={t("lessonPlaceholder")}
            className="w-full rounded border bg-gray-50 px-2 py-1 text-xs"
          />
        </label>
      </div>
      <label className="mt-2 block text-xs">
        {t("promptJson")}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full rounded border px-2 py-1 font-mono text-xs"
          aria-label={t("promptAria")}
        />
      </label>
      <label className="mt-2 block text-xs">
        {t("solutionJson")}
        <textarea
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          rows={4}
          className="w-full rounded border px-2 py-1 font-mono text-xs"
          aria-label={t("solutionAria")}
        />
      </label>

      <fieldset className="mt-4 rounded border p-3 dark:border-gray-700">
        <legend className="px-1 text-xs font-semibold">{t("imagesTitle")}</legend>
        <p className="text-[11px] text-gray-500">{t("imagesDesc")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_2fr_1.5fr_auto]">
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder={t("imageUrlPlaceholder")}
            className="rounded border px-2 py-1 text-xs"
            aria-label={t("imageUrlAria")}
          />
          <input
            value={draftAlt}
            onChange={(e) => setDraftAlt(e.target.value)}
            placeholder={t("imageAltPlaceholder")}
            className="rounded border px-2 py-1 text-xs"
            aria-label={t("imageAltAria")}
          />
          <input
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
            placeholder={t("captionPlaceholder")}
            className="rounded border px-2 py-1 text-xs"
            aria-label={t("captionAria")}
          />
          <button
            type="button"
            onClick={addImage}
            className="rounded bg-gray-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-gray-900"
          >
            {t("add")}
          </button>
        </div>

        {images.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {images.map((img, idx) => (
              <li key={idx} className="flex gap-2 rounded border p-2 dark:border-gray-700">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{img.alt}</p>
                  <p className="truncate text-[11px] text-gray-500">{img.url}</p>
                  {img.caption ? <p className="text-[11px] text-gray-500">{img.caption}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="h-fit rounded border px-2 py-1 text-xs"
                  aria-label={t("removeAria", { index: idx + 1 })}
                >
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-gray-400">{t("noImages")}</p>
        )}
      </fieldset>

      <button
        onClick={submit}
        className="bg-primary mt-3 rounded px-4 py-2 text-sm text-white"
        aria-label={t("saveAria")}
      >
        {t("save")}
      </button>
      {msg ? (
        <p className="mt-2 text-xs" aria-live="polite">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
