import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../../lib/db";
import ExerciseRunner from "./ExerciseRunner";
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
  } | null = null;
  try {
    exercise = await prisma.exercise.findUnique({ where: { id } });
  } catch {}
  if (!exercise) return <p className="text-sm text-gray-500">{t("notFound")}</p>;

  const assets = parseAssets(exercise.assets);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={`/lessons/${exercise.lessonId}`}
        className="text-xs text-indigo-600 hover:underline"
      >
        {t("backToLesson")}
      </Link>
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
      <ExerciseRunner exercise={exercise as never} />
    </div>
  );
}
