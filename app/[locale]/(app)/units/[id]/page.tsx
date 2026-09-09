import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../../lib/db";
import { resolveLessonKind, lessonKindBadgeClasses } from "../../../../../lib/lesson/types";
import { isCurrentUserAdmin } from "../../../../../lib/auth/requireAdmin";

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

export default async function UnitPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const tUnit = await getTranslations({ locale, namespace: "unit" });
  const tLesson = await getTranslations({ locale, namespace: "lesson" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  let unit: UnitRow | null = null;
  let dbUnavailable = false;

  try {
    unit = (await prisma.unit.findUnique({
      where: { id },
      include: { lessons: { orderBy: { orderIndex: "asc" } } },
    })) as unknown as UnitRow | null;
  } catch (e) {
    console.error("[UnitPage] prisma.unit.findUnique failed", { id, error: e });
    if (isConnectionError(e)) {
      dbUnavailable = true;
    } else {
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
      } catch (fallbackErr) {
        console.error("[UnitPage] fallback query failed", { id, error: fallbackErr });
        if (isConnectionError(fallbackErr)) dbUnavailable = true;
      }
    }
  }

  if (dbUnavailable) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {tUnit("dbUnavailable")}
        </p>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          {tCommon("dbUnavailableDesc")}
        </p>
      </div>
    );
  }

  if (!unit) {
    // Distinguish empty DB vs missing id; show admin CTA if empty and user is admin
    let isAdmin = false;
    let isEmptyDb = false;
    try {
      isAdmin = await isCurrentUserAdmin();
    } catch (e) {
      console.error("[UnitPage] isCurrentUserAdmin check failed", e);
    }
    try {
      const levelCount = await prisma.level.count();
      isEmptyDb = levelCount === 0;
      if (isEmptyDb) console.warn("[UnitPage] levels count is 0 — DB empty, seed required");
    } catch (e) {
      console.error("[UnitPage] level.count failed", e);
      if (isConnectionError(e)) {
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {tUnit("dbUnavailable")}
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {tCommon("dbUnavailableDesc")}
            </p>
          </div>
        );
      }
    }

    if (isEmptyDb) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{tUnit("notFound")}</p>
          <p className="text-sm text-gray-500">{tUnit("emptyDb")}</p>
          {isAdmin ? (
            <Link
              href="/admin/seed"
              className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {tUnit("adminSeedCta")}
            </Link>
          ) : null}
        </div>
      );
    }

    return <p className="text-sm text-gray-500">{tUnit("notFound")}</p>;
  }

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
