import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../../lib/db";
import { resolveLessonKind, lessonKindBadgeClasses } from "../../../../../lib/lesson/types";

type UnitRow = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  lessons: {
    id: string;
    title: string;
    objectives: string;
    orderIndex: number;
    estimatedMinutes: number;
    kind: string | null;
    coverImage: string | null;
    isQuiz: boolean;
    isExam: boolean;
  }[];
};

export default async function UnitPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const tUnit = await getTranslations({ locale, namespace: "unit" });
  const tLesson = await getTranslations({ locale, namespace: "lesson" });
  let unit: UnitRow | null = null;
  try {
    unit = (await prisma.unit.findUnique({
      where: { id },
      include: { lessons: { orderBy: { orderIndex: "asc" } } },
    })) as unknown as UnitRow | null;
  } catch {
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id, title, description, "cover_image" as "coverImage" FROM units WHERE id = $1 LIMIT 1`,
        id,
      )) as unknown as UnitRow[];
      unit = rows[0] ?? null;
      if (unit) {
        unit.lessons = (await prisma.lesson.findMany({
          where: { unitId: id },
          orderBy: { orderIndex: "asc" },
        })) as unknown as UnitRow["lessons"];
      }
    } catch {}
  }
  if (!unit) return <p className="text-sm text-gray-500">{tUnit("notFound")}</p>;

  return (
    <div className="space-y-5">
      {/* Unit header with coverImage */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {unit.coverImage ? (
          <div className="relative aspect-[16/6] w-full bg-gray-100 dark:bg-gray-800">
            <Image
              src={unit.coverImage}
              alt={tUnit("coverAlt", { title: unit.title })}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 900px"
              priority={false}
            />
          </div>
        ) : null}
        <div className="p-5">
          <h1 className="text-xl font-bold tracking-tight">{unit.title}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{unit.description}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {unit.lessons.map((l) => {
          const kind = resolveLessonKind(l as never);
          const kindLabel = tLesson(`kinds.${kind}`);
          return (
            <Link
              key={l.id}
              href={`/lessons/${l.id}`}
              className="group flex gap-3 overflow-hidden rounded-xl border bg-white p-0 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              {l.coverImage ? (
                <div className="relative hidden h-auto w-28 shrink-0 bg-gray-100 sm:block">
                  <Image src={l.coverImage} alt="" fill className="object-cover" sizes="112px" />
                </div>
              ) : (
                <div className="hidden w-28 shrink-0 items-center justify-center bg-gradient-to-br from-indigo-50 to-sky-50 text-lg sm:flex dark:from-indigo-950/30 dark:to-sky-950/30">
                  {kind === "exam" ? "🎓" : kind === "quiz" ? "📝" : "📖"}
                </div>
              )}
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {l.orderIndex}. {l.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${lessonKindBadgeClasses(kind)}`}
                    >
                      {kindLabel}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    {l.objectives}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {tUnit("min", { minutes: l.estimatedMinutes })}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-indigo-600 group-hover:underline dark:text-indigo-400">
                  {tUnit("open")}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
