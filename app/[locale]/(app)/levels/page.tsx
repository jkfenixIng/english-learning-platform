import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "../../../../lib/db";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";
import { createClient } from "../../../../lib/supabase/server";

type LevelRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  orderIndex: number;
  units?: { id: string; coverImage?: string | null }[];
};

const LEVEL_CODES_ALL = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const LEVEL_META: Record<string, { gradient: string; accent: string; blurb: string }> = {
  A1: {
    gradient: "from-emerald-500 to-teal-600",
    accent: "bg-emerald-500",
    blurb: "Greetings, introductions & everyday basics",
  },
  A2: {
    gradient: "from-sky-500 to-indigo-500",
    accent: "bg-sky-500",
    blurb: "Daily life, travel & simple work tasks",
  },
  B1: {
    gradient: "from-violet-500 to-purple-600",
    accent: "bg-violet-500",
    blurb: "Professional meetings, emails & culture",
  },
  B2: {
    gradient: "from-indigo-500 to-violet-600",
    accent: "bg-indigo-500",
    blurb: "Academic & business argument structure",
  },
  C1: {
    gradient: "from-amber-500 to-orange-600",
    accent: "bg-amber-500",
    blurb: "Advanced discourse & negotiation",
  },
  C2: {
    gradient: "from-slate-800 to-slate-950",
    accent: "bg-slate-800",
    blurb: "Mastery — nuance, register & idioms",
  },
};

function levelFallbackCover(code: string): string {
  // Prefer local pollinations-generated image, fallback to picsum
  return `/lesson-images/level-${code.toLowerCase()}.png`;
}

export default async function LevelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "level" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tDashboard = await getTranslations({ locale, namespace: "dashboard" });

  let levels: LevelRow[] = [];
  let dbError = false;
  try {
    const rows = (await prisma.level.findMany({
      orderBy: { orderIndex: "asc" },
      include: { units: { select: { id: true, coverImage: true } } },
    })) as unknown as LevelRow[];
    levels = rows;
  } catch (e) {
    console.error("[LevelsPage] prisma.level.findMany failed", e);
    dbError = true;
  }

  // ProgressionMode guard (client preference). Server fallback: show all.
  // If progressionMode === "locked", caller can filter blocked levels client-side;
  // we keep everything visible for "free" users — optional filtering documented here.
  // Future: fetch userPreferences via supabase and filter if locked.

  // Try to enrich with progress for "Continue" hint (best-effort)
  let continueHint: { lessonId: string; title: string } | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id && levels.length) {
      // Find most recent in-progress lesson (bestScore null or status in_progress)
      const recent = await prisma.progress.findFirst({
        where: { userId: user.id, status: { in: ["in_progress", "not_started"] } },
        orderBy: { updatedAt: "desc" },
        include: { lesson: { select: { id: true, title: true } } },
      });
      if (recent?.lesson) {
        continueHint = { lessonId: recent.lesson.id, title: recent.lesson.title };
      }
    }
  } catch {
    /* best-effort only */
  }

  if (dbError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {tCommon("dbUnavailable")}
        </p>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          {tCommon("dbUnavailableDesc")}
        </p>
      </div>
    );
  }

  if (levels.length === 0) {
    let isAdmin = false;
    try {
      isAdmin = await isCurrentUserAdmin();
    } catch {}
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Levels</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Explore the 6 CEFR levels — from A1 to C2. Seed the database to unlock full content.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEVEL_CODES_ALL.map((code) => {
            const meta = LEVEL_META[code]!;
            return (
              <div
                key={code}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className={`h-28 bg-gradient-to-br ${meta.gradient} relative p-4`}>
                  <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tracking-widest text-white backdrop-blur">
                    {code}
                  </span>
                  <p className="mt-2 max-w-[85%] text-sm leading-snug font-medium text-white/95">
                    {meta.blurb}
                  </p>
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent"
                    aria-hidden
                  />
                </div>
                <div className="p-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="mt-3 inline-flex h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            );
          })}
        </div>
        {isAdmin ? (
          <Link
            href="/admin/seed"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            {tCommon("seedCta")} <span aria-hidden>→</span>
          </Link>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("notFound", { code: "A1" })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {tDashboard("levels")}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Choose your CEFR level — each level has focused units, teach → practice → quiz → exam
            flow. Free mode keeps everything visible; locked progression filters later.
          </p>
        </div>
        {continueHint && (
          <Link
            href={`/lessons/${continueHint.lessonId}`}
            className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Continue: {continueHint.title}
          </Link>
        )}
      </div>

      {/* Grid A1-C2 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((lvl) => {
          const meta = LEVEL_META[lvl.code] ?? LEVEL_META["A1"]!;
          const unitsCount = lvl.units?.length ?? 0;
          const cover = levelFallbackCover(lvl.code);
          return (
            <Link
              key={lvl.code}
              href={`/levels/${lvl.code}`}
              className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                className={`relative h-36 overflow-hidden bg-gradient-to-br ${meta.gradient} p-4`}
              >
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold tracking-widest text-slate-900 shadow-sm">
                      <span className={`h-2 w-2 rounded-full ${meta.accent}`} aria-hidden />
                      {lvl.code}
                    </span>
                    <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                      {unitsCount} units
                    </span>
                  </div>
                  <div>
                    <h2 className="text-[15px] leading-tight font-semibold text-white">
                      {lvl.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/85">
                      {meta.blurb}
                    </p>
                  </div>
                </div>
                {/* subtle cover hint - use fallback image as overlay mix */}
                <div className="absolute inset-0 opacity-20 mix-blend-overlay">
                  <Image
                    src={cover}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="400px"
                    unoptimized
                  />
                </div>
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
                  aria-hidden
                />
              </div>
              <div className="p-4">
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {lvl.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 group-hover:gap-1.5 group-hover:underline dark:text-violet-300">
                  {t("viewLessons")} <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ProgressionMode note */}
      <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Progression:</span> free
        = all levels visible. locked mode would gate levels until previous exam passes — docs:
        preferences.progressionMode.
      </div>
    </div>
  );
}
