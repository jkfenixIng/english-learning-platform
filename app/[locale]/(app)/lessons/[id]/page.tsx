import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../../lib/db";
import { TeachingContent } from "../../../../../components/lesson/TeachingContent";
import {
  resolveLessonKind,
  isTeachKind,
  lessonKindBadgeClasses,
} from "../../../../../lib/lesson/types";
import type { LessonContent } from "../../../../../lib/lesson/types";

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
  unit?: { title: string; id: string; level?: { code: string } | null } | null;
  exercises: { id: string; type: string; difficulty: number; assets: unknown }[];
};

function parseContent(raw: unknown): LessonContent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { blocks?: unknown };
  if (!Array.isArray(obj.blocks)) return null;
  return obj as LessonContent;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "lesson" });
  let lesson: LessonRow | null = null;
  try {
    lesson = (await prisma.lesson.findUnique({
      where: { id },
      include: {
        exercises: { orderBy: { createdAt: "asc" } },
        unit: { include: { level: true } },
      },
    })) as unknown as LessonRow | null;
  } catch {
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
    } catch {}
  }

  if (!lesson) return <p className="text-sm text-gray-500">{t("notFound")}</p>;

  const kind = resolveLessonKind(lesson as never);
  const teach = isTeachKind(kind);
  const content = parseContent(lesson.content);
  const exercises = lesson.exercises ?? [];
  const kindLabel = t(`kinds.${kind}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
        <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{lesson.objectives}</p>
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
              title={lesson.title}
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
              <TeachingContent content={null} coverImage={lesson.coverImage} title={lesson.title} />
            </div>
          ) : null}

          <section
            aria-labelledby="evaluation-heading"
            className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="evaluation-heading" className="text-sm font-semibold tracking-wide uppercase">
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
  );
}
