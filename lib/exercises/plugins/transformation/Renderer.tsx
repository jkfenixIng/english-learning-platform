"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import type { TransformationPrompt, TransformationAnswer } from "./schema";
export function TransformationRenderer({
  prompt,
  onSubmit,
}: {
  prompt: TransformationPrompt;
  onSubmit: (a: TransformationAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{prompt.instruction}</p>
      <p className="rounded border border-slate-200 bg-slate-50 p-3 text-slate-900 italic dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        {prompt.sentence}
      </p>
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("yourAnswer")} />
      <button
          data-exercise-submit
        onClick={() => onSubmit({ text })}
        className="bg-primary rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
