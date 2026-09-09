"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { WritingPrompt, WritingAnswer } from "./schema";
export function WritingPromptRenderer({
  prompt,
  onSubmit,
}: {
  prompt: WritingPrompt;
  onSubmit: (a: WritingAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [text, setText] = useState("");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-y-3">
      <p className="font-medium">{prompt.prompt}</p>
      <p className="text-xs text-gray-500">
        {t("wordsSuggested", { min: prompt.minWords, max: prompt.maxWords })}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={t("writeAnswer")}
        className="focus-visible:ring-primary-500 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{t("words", { count: words })}</span>
        <button
          onClick={() => onSubmit({ text })}
          className="bg-primary rounded px-4 py-2 text-white"
        >
          {t("submitCorrection")}
        </button>
      </div>
    </div>
  );
}
