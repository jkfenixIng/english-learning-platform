"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { getLessonTitle } from "@/lib/lesson/localize";
import { lessonKindBadgeClasses, type LessonKind } from "@/lib/lesson/types";

type SiblingLesson = {
  id: string;
  title: string;
  orderIndex: number;
  kind: LessonKind | string | null;
  isQuiz?: boolean;
  isExam?: boolean;
  completed?: boolean;
};

type Props = {
  locale: string;
  unitId: string;
  unitTitle: string;
  levelCode?: string | undefined;
  currentLessonId: string;
  siblings: SiblingLesson[];
  completedIds?: Set<string> | string[];
};

function resolveKind(s: SiblingLesson): LessonKind {
  const k = s.kind as LessonKind | null | undefined;
  if (k === "teach" || k === "practice" || k === "quiz" || k === "exam") return k;
  if (s.isExam) return "exam";
  if (s.isQuiz) return "quiz";
  return "teach";
}

export function LessonNav({
  locale,
  unitId,
  unitTitle,
  levelCode,
  currentLessonId,
  siblings,
  completedIds,
}: Props) {
  const t = useTranslations("lesson");
  const tCommon = useTranslations("common");
  // Optional nav keys with fallback to hardcoded strings if not yet in messages
  let navCounter = "";
  let prevLabel = "";
  let nextLabel = "";
  try {
    // Will throw if key missing when using next-intl strict; we guard with try
    navCounter = t("nav.counter");
  } catch {
    navCounter = "";
  }
  try {
    prevLabel = t("nav.prev");
  } catch {
    prevLabel = locale === "es" ? "Anterior" : "Previous";
  }
  try {
    nextLabel = t("nav.next");
  } catch {
    nextLabel = locale === "es" ? "Siguiente" : "Next";
  }

  const completedSet = completedIds instanceof Set ? completedIds : new Set(completedIds ?? []);

  const sorted = [...siblings].sort((a, b) => a.orderIndex - b.orderIndex);
  const currentIdx = sorted.findIndex((s) => s.id === currentLessonId);
  const total = sorted.length;
  const currentPos = currentIdx >= 0 ? currentIdx + 1 : 1;
  const prev = currentIdx > 0 ? sorted[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < total - 1 ? sorted[currentIdx + 1] : null;

  const breadcrumbLevelCode = levelCode ?? null;

  const counterText =
    locale === "es" ? `Lección ${currentPos} de ${total}` : `Lesson ${currentPos} of ${total}`;

  // Prefer translated counter if it exists and contains placeholders
  let displayCounter = counterText;
  if (navCounter && navCounter.includes("{current}")) {
    try {
      displayCounter = t("nav.counter", { current: currentPos, total });
    } catch {
      displayCounter = counterText;
    }
  }

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 dark:text-slate-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              href="/dashboard"
              className="hover:text-slate-700 hover:underline dark:hover:text-slate-200"
            >
              {locale === "es" ? "Panel" : "Dashboard"}
            </Link>
          </li>
          <li aria-hidden className="text-slate-400">
            ›
          </li>
          {breadcrumbLevelCode ? (
            <>
              <li>
                <Link
                  href={`/levels/${breadcrumbLevelCode}`}
                  className="hover:text-slate-700 hover:underline dark:hover:text-slate-200"
                >
                  {locale === "es"
                    ? `Nivel ${breadcrumbLevelCode}`
                    : `Level ${breadcrumbLevelCode}`}
                </Link>
              </li>
              <li aria-hidden className="text-slate-400">
                ›
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  href="/levels"
                  className="hover:text-slate-700 hover:underline dark:hover:text-slate-200"
                >
                  {locale === "es" ? "Niveles" : "Levels"}
                </Link>
              </li>
              <li aria-hidden className="text-slate-400">
                ›
              </li>
            </>
          )}
          <li>
            <Link
              href={`/units/${unitId}`}
              className="hover:text-slate-700 hover:underline dark:hover:text-slate-200"
            >
              <span className="inline-block max-w-[14ch] truncate align-bottom" title={unitTitle}>
                {unitTitle}
              </span>
            </Link>
          </li>
          <li aria-hidden className="text-slate-400">
            ›
          </li>
          <li
            aria-current="page"
            className="max-w-[14ch] truncate font-semibold text-slate-900 dark:text-white"
            title={getLessonTitle(sorted[currentIdx]?.title ?? "", locale)}
          >
            {currentIdx >= 0 ? getLessonTitle(sorted[currentIdx]!.title, locale) : ""}
          </li>
        </ol>
      </nav>

      {/* Prev / Next rail + counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          {prev ? (
            <Link
              href={`/lessons/${prev.id}`}
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
              href={`/lessons/${next.id}`}
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
          {displayCounter}
        </span>
      </div>

      {/* Sidebar rail: vertical list of lessons in unit */}
      {total > 1 ? (
        <div className="hidden lg:block">
          <div className="sticky top-16 rounded-xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">
              {(() => {
                try {
                  return t("nav.unitLessons");
                } catch {
                  return locale === "es" ? "Lecciones de la unidad" : "Unit lessons";
                }
              })()}{" "}
              <span className="font-normal normal-case">({total})</span>
            </p>
            <ul className="space-y-1">
              {sorted.map((s) => {
                const kind = resolveKind(s);
                const isActive = s.id === currentLessonId;
                const isCompleted = completedSet.has(s.id) || s.completed === true;
                const title = getLessonTitle(s.title, locale);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/lessons/${s.id}`}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition",
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                          : "border-transparent bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          isActive
                            ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                            : isCompleted
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                        )}
                        aria-hidden
                      >
                        {isCompleted ? "✓" : s.orderIndex}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          isActive
                            ? "bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900"
                            : lessonKindBadgeClasses(kind),
                        )}
                      >
                        {(() => {
                          try {
                            return t(`kinds.${kind}`);
                          } catch {
                            return kind;
                          }
                        })()}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
