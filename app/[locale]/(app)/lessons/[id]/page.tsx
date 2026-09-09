import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../../lib/db";
import { TeachingContent } from "../../../../../components/lesson/TeachingContent";
import { LessonNav } from "../../../../../components/lesson/LessonNav";
import {
  resolveLessonKind,
  isTeachKind,
  lessonKindBadgeClasses,
} from "../../../../../lib/lesson/types";
import type { LessonContent } from "../../../../../lib/lesson/types";
import {
  getLessonTitle,
  getLessonObjectives,
  getUnitTitle,
  localizeContent,
} from "../../../../../lib/lesson/localize";
import { isCurrentUserAdmin } from "../../../../../lib/auth/requireAdmin";
import { createClient } from "../../../../../lib/supabase/server";

type LessonRow = {
  id: string;
  title: string;
  objectives: string;
  orderIndex: number;
  estimatedMinutes: number;
  kind: string | null;
  content: unknown;
  bodyMarkdown: string | null;
  coverImage: string | null;
  isQuiz: boolean;
  isExam: boolean;
  unitId?: string | null;
  unit?: { title: string; id: string; level?: { code: string } | null } | null;
  exercises: { id: string; type: string; difficulty: number; assets: unknown }[];
};

function parseContent(raw: unknown): LessonContent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { blocks?: unknown };
  if (!Array.isArray(obj.blocks)) return null;
  return obj as LessonContent;
}

function isConnectionError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: string; message?: string };
  if (err.code === "P1001" || err.code === "P1002" || err.code === "P1008") return true;
  const msg = String(err.message ?? "").toLowerCase();
  return (
    msg.includes("can't reach database server") ||
    msg.includes("can't reach database") ||
    msg.includes("p1001") ||
    (msg.includes("connection") && (msg.includes("timeout") || msg.includes("terminated"))) ||
    msg.includes("connection terminated") ||
    msg.includes("econnrefused")
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "lesson" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  let lesson: LessonRow | null = null;
  let dbUnavailable = false;

  try {
    lesson = (await prisma.lesson.findUnique({
      where: { id },
      include: {
        exercises: { orderBy: { createdAt: "asc" } },
        unit: { include: { level: true } },
      },
    })) as unknown as LessonRow | null;
  } catch (e) {
    console.error("[LessonPage] prisma.lesson.findUnique failed", { id, error: e });
    if (isConnectionError(e)) {
      dbUnavailable = true;
    } else {
      try {
        const rows = (await prisma.$queryRawUnsafe(
          `SELECT id, title, objectives, "order_index" as "orderIndex", "estimated_minutes" as "estimatedMinutes", "is_quiz" as "isQuiz", "is_exam" as "isExam", "unit_id" as "unitId" FROM lessons WHERE id = $1 LIMIT 1`,
          id,
        )) as unknown as LessonRow[];
        lesson = rows[0] ?? null;
        if (lesson) {
          const exercises = (await prisma.exercise.findMany({
            where: { lessonId: id },
          })) as unknown as LessonRow["exercises"];
          lesson.exercises = exercises;
          lesson.kind = null;
          lesson.content = null;
          lesson.coverImage = null;
          lesson.bodyMarkdown = null;
        }
      } catch (fallbackErr) {
        console.error("[LessonPage] fallback query failed", { id, error: fallbackErr });
        if (isConnectionError(fallbackErr)) dbUnavailable = true;
      }
    }
  }

  if (dbUnavailable) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {t("dbUnavailable")}
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-300">{tCommon("dbUnavailableDesc")}</p>
      </div>
    );
  }

  if (!lesson) {
    let isAdmin = false;
    let isEmptyDb = false;
    try {
      isAdmin = await isCurrentUserAdmin();
    } catch (e) {
      console.error("[LessonPage] isCurrentUserAdmin check failed", e);
    }
    try {
      const levelCount = await prisma.level.count();
      isEmptyDb = levelCount === 0;
      if (isEmptyDb) console.warn("[LessonPage] levels count is 0 — DB empty, seed required");
    } catch (e) {
      console.error("[LessonPage] level.count failed", e);
      if (isConnectionError(e)) {
        return (
          <div className="mx-auto max-w-3xl space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t("dbUnavailable")}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {tCommon("dbUnavailableDesc")}
            </p>
          </div>
        );
      }
    }

    if (isEmptyDb) {
      return (
        <div className="mx-auto max-w-3xl space-y-3">
          <p className="text-sm text-gray-500">{t("notFound")}</p>
          <p className="text-sm text-gray-500">{t("emptyDb")}</p>
          {isAdmin ? (
            <Link
              href="/admin/seed"
              className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t("adminSeedCta")}
            </Link>
          ) : null}
        </div>
      );
    }

    return <p className="text-sm text-gray-500">{t("notFound")}</p>;
  }

  const kind = resolveLessonKind(lesson as never);
  const teach = isTeachKind(kind);
  const rawContent = parseContent(lesson.content);
  const content = localizeContent(rawContent, locale);
  const exercises = lesson.exercises ?? [];
  const kindLabel = t(`kinds.${kind}`);
  const displayTitle = getLessonTitle(lesson.title, locale);
  const displayObjectives = getLessonObjectives(lesson.objectives, locale);

  // ---- Sibling lessons for LessonNav (prev/next + sidebar) ----
  const unitIdForNav =
    (lesson as unknown as { unitId?: string | null }).unitId ?? lesson.unit?.id ?? null;
  const unitTitleRaw = lesson.unit?.title ?? "";
  const unitTitleForNav = unitTitleRaw ? getUnitTitle(unitTitleRaw, locale) : "";
  const levelCodeForNav = lesson.unit?.level?.code ?? undefined;
  let siblingLessons: {
    id: string;
    title: string;
    orderIndex: number;
    kind: string | null;
    isQuiz: boolean;
    isExam: boolean;
  }[] = [];
  let completedIds: string[] = [];
  if (unitIdForNav) {
    try {
      siblingLessons = (await prisma.lesson.findMany({
        where: { unitId: unitIdForNav },
        orderBy: { orderIndex: "asc" },
        select: { id: true, title: true, orderIndex: true, kind: true, isQuiz: true, isExam: true },
      })) as unknown as typeof siblingLessons;
    } catch (e) {
      console.error("[LessonPage] sibling lessons fetch failed", e);
      // fallback raw query if needed
      try {
        const rows = (await prisma.$queryRawUnsafe(
          `SELECT id, title, "order_index" as "orderIndex", kind, "is_quiz" as "isQuiz", "is_exam" as "isExam" FROM lessons WHERE "unit_id" = $1 ORDER BY "order_index" ASC`,
          unitIdForNav,
        )) as unknown as typeof siblingLessons;
        siblingLessons = rows ?? [];
      } catch {}
    }
    // progress: check completed lessons for current user
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (uid && siblingLessons.length > 0) {
        const ids = siblingLessons.map((s) => s.id);
        const progressRows = (await prisma.progress.findMany({
          where: { userId: uid, lessonId: { in: ids } },
          select: { lessonId: true, status: true, completedAt: true },
        })) as unknown as { lessonId: string; status: string; completedAt: Date | null }[];
        completedIds = progressRows
          .filter((r) => r.status === "completed" || !!r.completedAt)
          .map((r) => r.lessonId);
      }
    } catch (e) {
      console.error("[LessonPage] progress fetch failed", e);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {unitIdForNav ? (
        <LessonNav
          locale={locale}
          unitId={unitIdForNav}
          unitTitle={unitTitleForNav || unitTitleRaw}
          levelCode={levelCodeForNav}
          currentLessonId={lesson.id}
          siblings={siblingLessons}
          completedIds={completedIds}
        />
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="mx-auto w-full max-w-3xl min-w-0 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lessonKindBadgeClasses(kind)}`}
              >
                {kindLabel}
              </span>
              <span className="text-xs text-gray-500">
                {t("estimatedMinutes", { minutes: lesson.estimatedMinutes })} •{" "}
                {t("lessonIndex", { index: lesson.orderIndex })}
                {lesson.unit?.title ? ` • ${lesson.unit.title}` : ""}
              </span>
              {kind === "exam" ? (
                <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                  {t("finalEvaluation")}
                </span>
              ) : null}
              {kind === "quiz" ? (
                <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  {t("quizAttemptsTracked")}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{displayTitle}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{displayObjectives}</p>
          </div>

          {teach ? (
            <>
              <section
                aria-labelledby="content-heading"
                className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    id="content-heading"
                    className="text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-200"
                  >
                    {t("contentHeading")}
                  </h2>
                  <span className="text-xs text-gray-500">{t("learnFirst")}</span>
                </div>
                <TeachingContent
                  content={content}
                  bodyMarkdown={lesson.bodyMarkdown}
                  coverImage={lesson.coverImage}
                  title={displayTitle}
                  locale={locale}
                />
                {exercises.length > 0 ? (
                  <div className="mt-6 flex justify-end">
                    <Link
                      href="#evaluation"
                      className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      {t("practiceCta")}
                    </Link>
                  </div>
                ) : null}
              </section>

              <section
                id="evaluation"
                aria-labelledby="evaluation-heading"
                className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2
                    id="evaluation-heading"
                    className="text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-200"
                  >
                    {t("practiceHeading")}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {t("practiceMeta", { count: exercises.length })}
                  </span>
                </div>
                {exercises.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("noPractice")}</p>
                ) : (
                  <div className="space-y-2">
                    {exercises.map((ex, idx) => (
                      <Link
                        key={ex.id}
                        href={`/exercises/${ex.id}`}
                        className="flex items-center justify-between rounded-lg border bg-white p-3 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            #{idx + 1} {ex.type.replace("_", " ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t("difficulty", { level: ex.difficulty })}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                          {t("practiceBadge")}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  {kind === "exam" ? t("examModeTitle") : t("quizModeTitle")}
                </p>
                <p className="mt-1 text-amber-800 dark:text-amber-300">{t("evaluationDesc")}</p>
              </div>

              {lesson.coverImage ? (
                <div className="overflow-hidden rounded-xl border bg-white dark:border-gray-800">
                  <TeachingContent
                    content={null}
                    coverImage={lesson.coverImage}
                    title={displayTitle}
                    locale={locale}
                  />
                </div>
              ) : null}

              <section
                aria-labelledby="evaluation-heading"
                className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2
                    id="evaluation-heading"
                    className="text-sm font-semibold tracking-wide uppercase"
                  >
                    {t("evaluationHeading")}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {kind === "exam"
                      ? t("evaluationMetaExam", { count: exercises.length })
                      : t("evaluationMetaQuiz", { count: exercises.length })}
                  </span>
                </div>
                {exercises.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("noEvaluation")}</p>
                ) : (
                  <div className="space-y-2">
                    {exercises.map((ex, idx) => (
                      <Link
                        key={ex.id}
                        href={`/exercises/${ex.id}`}
                        className="flex items-center justify-between rounded-lg border-2 border-indigo-100 bg-white p-3 hover:bg-indigo-50 dark:border-indigo-900/30 dark:bg-gray-900 dark:hover:bg-gray-800"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            #{idx + 1} {ex.type.replace("_", " ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t("difficultyAttempts", { level: ex.difficulty })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white ${kind === "exam" ? "bg-red-600" : "bg-amber-600"}`}
                        >
                          {kind === "exam" ? t("examBadge") : t("quizBadge")}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-gray-500">{t("progressHint")}</p>
              </section>
            </>
          )}
        </div>
        {/* Rail placeholder keeps LessonNav sticky list visible on desktop within grid; LessonNav already renders its own rail, this column balances layout */}
        <div className="hidden lg:block" aria-hidden />
      </div>
    </div>
  );
}
