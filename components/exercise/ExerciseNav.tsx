"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { getLessonTitle } from "@/lib/lesson/localize";

type SiblingExercise = {
  id: string;
  type: string;
};

type Props = {
  locale: string;
  lessonId: string;
  lessonTitle: string;
  currentExerciseId: string;
  siblings: SiblingExercise[];
};

export function ExerciseNav({ locale, lessonId, lessonTitle, currentExerciseId, siblings }: Props) {
  const t = useTranslations("exercise");
  const displayTitle = lessonTitle ? getLessonTitle(lessonTitle, locale) : lessonTitle;
  const total = siblings.length;
  const idx = siblings.findIndex((s) => s.id === currentExerciseId);
  const currentPos = idx >= 0 ? idx + 1 : 1;
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < total - 1 ? siblings[idx + 1] : null;

  // Try to use translated counter, fallback to hardcoded
  let counterText =
    locale === "es" ? `Ejercicio ${currentPos} de ${total}` : `Exercise ${currentPos} of ${total}`;
  try {
    const translated = t("exerciseCounter", { current: currentPos, total });
    if (translated && translated !== "exerciseCounter") counterText = translated;
  } catch {
    // keep fallback
  }

  let prevLabel = locale === "es" ? "Anterior" : "Previous";
  let nextLabel = locale === "es" ? "Siguiente" : "Next";
  try {
    prevLabel = t("prevExercise");
  } catch {}
  try {
    nextLabel = t("nextExercise");
  } catch {}

  let lessonLabel = displayTitle;
  try {
    lessonLabel = t("lessonLabel", { title: displayTitle });
  } catch {}

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link
          href={`/lessons/${lessonId}`}
          className="hover:text-slate-700 hover:underline dark:hover:text-slate-200"
        >
          {t("backToLesson")}
        </Link>
        <span aria-hidden>·</span>
        <span className="max-w-[28ch] truncate" title={displayTitle}>
          {lessonLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          {prev ? (
            <Link
              href={`/exercises/${prev.id}`}
              className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span aria-hidden>←</span> {prevLabel}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-500">
              <span aria-hidden>←</span> {prevLabel}
            </span>
          )}
          {next ? (
            <Link
              href={`/exercises/${next.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {nextLabel} <span aria-hidden>→</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              {nextLabel} <span aria-hidden>→</span>
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {counterText}
        </span>
      </div>
    </div>
  );
}
