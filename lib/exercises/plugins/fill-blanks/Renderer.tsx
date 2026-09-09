"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { FillBlanksPrompt, FillBlanksAnswer } from "./schema";

export function FillBlanksRenderer({
  prompt,
  onSubmit,
}: {
  prompt: FillBlanksPrompt;
  onSubmit: (a: FillBlanksAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const parts = prompt.text.split(/(___|\{\{blank\}\})/g);

  let blankIdx = 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-lg leading-relaxed">
        {parts.map((part, i) => {
          if (part === "___" || part === "{{blank}}") {
            const blank = prompt.blanks[blankIdx++];
            if (!blank) return <span key={i}>___</span>;
            return (
              <input
                key={i}
                aria-label={blank.hint ?? t("blankHint", { id: blank.id })}
                placeholder={blank.hint ?? t("blankPlaceholder")}
                value={answers[blank.id] ?? ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [blank.id]: e.target.value }))}
                className="focus-visible:ring-primary-500 w-32 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
      <button
        data-exercise-submit
        onClick={() => onSubmit({ answers })}
        className="bg-primary hover:bg-primary/90 rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
