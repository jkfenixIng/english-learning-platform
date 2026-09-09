"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import "../../../../../lib/exercises/init";

import { getPlugin } from "../../../../../lib/exercises/registry";
import type { ExerciseType } from "../../../../../lib/exercises/types";

interface Props {
  exercise: { id: string; type: string; prompt: unknown; solution: unknown };
  siblings?: { id: string; type: string }[];
  lessonTitle?: string;
  locale?: string;
}

const EVALUABLE_TYPES = new Set<ExerciseType>([
  "fill_blanks",
  "ordering",
  "transformation",
  "matching",
  "comprehension",
  "graded_reading",
  "listening_tts",
  "dictation",
  "writing_prompt",
  "speaking_record",
  "shadowing",
  "pronunciation",
  "flashcard",
]);

export default function ExerciseRunner({ exercise, siblings, lessonTitle, locale }: Props) {
  const t = useTranslations("exercise");
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const plugin = getPlugin(exercise.type as ExerciseType);

  // Keyboard shortcut: Enter to trigger submit (find button with data-exercise-submit)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      // Don't hijack when user is composing or shift+enter for writing_prompt
      if (e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      // Allow Enter in inputs/textareas to trigger submit; avoid double submit when already focusing a button
      if (target && target.tagName === "BUTTON") return;
      const btn = document.querySelector("[data-exercise-submit]") as HTMLButtonElement | null;
      if (btn && !btn.disabled && !loading) {
        e.preventDefault();
        btn.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading]);

  if (!plugin)
    return <p className="text-sm text-red-600">{t("unknownType", { type: exercise.type })}</p>;

  const Renderer = plugin.Renderer as React.ComponentType<{
    prompt: unknown;
    onSubmit: (a: unknown) => void;
  }>;

  const handleSubmit = async (answer: unknown) => {
    setLoading(true);
    try {
      // client-side evaluate for instant feedback
      const evalResult = plugin.evaluate(
        exercise.prompt as never,
        exercise.solution,
        answer as never,
      );
      setResult(evalResult);
      // persist attempt
      await fetch(`/api/exercises/${exercise.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, timeSpentMs: 5000 }),
      });
    } catch (e) {
      setResult({ score: 0, feedback: String(e) });
    }
    setLoading(false);
  };

  // Navigation between exercises in same lesson
  let nav: { prevId: string | null; nextId: string | null; counter: string | null } = {
    prevId: null,
    nextId: null,
    counter: null,
  };
  if (siblings && siblings.length > 1) {
    const idx = siblings.findIndex((s) => s.id === exercise.id);
    if (idx >= 0) {
      const total = siblings.length;
      const current = idx + 1;
      const prevId = idx > 0 ? siblings[idx - 1]!.id : null;
      const nextId = idx < total - 1 ? siblings[idx + 1]!.id : null;
      let counter: string;
      try {
        counter = t("exerciseCounter", { current, total });
      } catch {
        counter =
          locale === "es" ? `Ejercicio ${current} de ${total}` : `Exercise ${current} of ${total}`;
      }
      nav = { prevId, nextId, counter };
    }
  }

  const isEvaluable = EVALUABLE_TYPES.has(exercise.type as ExerciseType);
  // Dynamic submit label: most exercises are evaluable -> "Validar respuesta"/"Check answer", fallback "Enviar"/"Submit" kept for non-evaluable
  let submitLabel: string | null = null;
  let evaluatedHint: string | null = null;
  try {
    submitLabel = isEvaluable ? t("submit") : t("submitFallback");
  } catch {
    submitLabel = null;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <Renderer prompt={exercise.prompt as never} onSubmit={handleSubmit} />
        {loading ? <p className="mt-3 text-sm text-gray-500">{t("evaluating")}</p> : null}
        {result ? (
          <div
            className={`mt-4 rounded border p-3 text-sm ${result.score >= 70 ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}
          >
            <p className="font-semibold">{t("scoreLabel", { score: result.score })}</p>
            <p>{result.feedback}</p>
          </div>
        ) : null}
        {/* Hint for keyboard shortcut */}
        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
          {locale === "es" ? "Atajo: Enter para validar" : "Shortcut: Enter to submit"}
          {submitLabel ? ` · ${submitLabel}` : ""}
        </p>
      </div>
      {nav.counter ? (
        <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            {nav.prevId ? (
              <Link
                href={`/exercises/${nav.prevId}`}
                className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span aria-hidden>←</span> {t("prevExercise")}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-500">
                <span aria-hidden>←</span> {t("prevExercise")}
              </span>
            )}
            {nav.nextId ? (
              <Link
                href={`/exercises/${nav.nextId}`}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {t("nextExercise")} <span aria-hidden>→</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                {t("nextExercise")} <span aria-hidden>→</span>
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {nav.counter}
          </span>
        </div>
      ) : null}
    </div>
  );
}
