"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { OrderingPrompt, OrderingAnswer } from "./schema";
export function OrderingRenderer({
  prompt,
  onSubmit,
}: {
  prompt: OrderingPrompt;
  onSubmit: (a: OrderingAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [order, setOrder] = useState<string[]>([...prompt.tokens].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (token: string) => {
    if (selected.includes(token)) setSelected(selected.filter((t) => t !== token));
    else setSelected([...selected, token]);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t("clickTokens")}</p>
      <div className="flex flex-wrap gap-2">
        {order.map((tk) => (
          <button
            key={tk}
            onClick={() => toggle(tk)}
            className={`rounded-full border px-3 py-1 text-sm ${selected.includes(tk) ? "border-primary bg-primary dark:border-primary-600 text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"}`}
          >
            {tk}
          </button>
        ))}
      </div>
      <div className="min-h-10 rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        {selected.join(" ") || "—"}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setSelected([])}
          className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          {t("clear")}
        </button>
        <button
          data-exercise-submit
        onClick={() => onSubmit({ order: selected })}
          className="bg-primary rounded px-4 py-2 text-sm text-white"
        >
          {t("submit")}
        </button>
      </div>
    </div>
  );
}
