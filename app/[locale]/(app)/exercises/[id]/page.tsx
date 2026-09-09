import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../../lib/db";
import ExerciseRunner from "./ExerciseRunner";
import { ExerciseNav } from "../../../../../components/exercise/ExerciseNav";
import { getLessonTitle } from "../../../../../lib/lesson/localize";
import type { ExerciseAssets } from "../../../../../lib/exercises/types";

function parseAssets(raw: unknown): ExerciseAssets | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { images?: unknown };
  if (!Array.isArray(obj.images)) return null;
  return obj as ExerciseAssets;
}

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "exercise" });
  let exercise: {
    id: string;
    type: string;
    prompt: unknown;
    solution: unknown;
    lessonId: string;
    assets: unknown;
    createdAt?: Date;
  } | null = null;
  try {
    exercise = await prisma.exercise.findUnique({ where: { id } });
  } catch {}
  if (!exercise) return <p className="text-sm text-gray-500">{t("notFound")}</p>;

  const assets = parseAssets(exercise.assets);

  // Sibling exercises in same lesson (ordered by createdAt as lessons page does)
  let siblingExercises: { id: string; type: string; createdAt: Date }[] = [];
  let lessonTitle = "";
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: exercise.lessonId },
      select: { title: true },
    });
    if (lesson) lessonTitle = (lesson as unknown as { title: string }).title;
  } catch {}
  try {
    siblingExercises = (await prisma.exercise.findMany({
      where: { lessonId: exercise.lessonId },
      orderBy: { createdAt: "asc" },
      select: { id: true, type: true, createdAt: true },
    })) as unknown as typeof siblingExercises;
  } catch {
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id, type, "created_at" as "createdAt" FROM exercises WHERE "lesson_id" = $1 ORDER BY "created_at" ASC`,
        exercise.lessonId,
      )) as unknown as typeof siblingExercises;
      siblingExercises = rows ?? [];
    } catch {}
  }
  // Ensure current exercise is included even if fetch failed
  if (siblingExercises.length === 0) {
    siblingExercises = [{ id: exercise.id, type: exercise.type, createdAt: new Date() }];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ExerciseNav
        locale={locale}
        lessonId={exercise.lessonId}
        lessonTitle={lessonTitle || exercise.lessonId}
        currentExerciseId={exercise.id}
        siblings={siblingExercises}
      />
      <p className="text-xs tracking-wide text-gray-500 uppercase">
        {exercise.type} {t("typeSuffix")}
      </p>
      {assets?.images?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {assets.images.map((img) => (
            <figure
              key={img.url}
              className="overflow-hidden rounded-xl border bg-white dark:border-gray-800"
            >
              <div className="relative aspect-[4/3] w-full bg-gray-50 dark:bg-gray-800">
                <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="320px" />
              </div>
              {img.caption ? (
                <figcaption className="px-3 py-2 text-xs text-gray-500">{img.caption}</figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      ) : null}
      <ExerciseRunner
        exercise={exercise as never}
        siblings={siblingExercises}
        lessonTitle={lessonTitle}
        locale={locale}
      />
    </div>
  );
}
