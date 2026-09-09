import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "../../../../lib/db";
import { createClient } from "../../../../lib/supabase/server";
import { ensureUserFromSupabase } from "../../../../lib/auth/ensureUser";
import { XpBar } from "../../../../components/gamification/XpBar";
import { StreakIndicator } from "../../../../components/gamification/StreakIndicator";

function pickRecommendedLevel(
  levels: { code: string; title: string }[],
  placementCode?: string | null,
): string {
  if (placementCode && levels.some((l) => l.code === placementCode)) return placementCode;
  return levels[0]?.code ?? "A1";
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  let levels: { code: string; title: string }[] = [];
  try {
    levels = (await prisma.level.findMany({
      orderBy: { orderIndex: "asc" },
    })) as unknown as typeof levels;
  } catch {
    /* db not yet migrated */
  }

  // Real gamification state - never mock. New users start at Level 1 (0 XP) and 0 streak.
  let xp = 0;
  let currentStreak = 0;
  let userId: string | null = null;
  let placementRecommended: string | null = null;
  let continueLesson: { id: string; title: string; unitTitle?: string } | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      userId = user.id;
      try {
        let streak = await prisma.userStreak.findUnique({ where: { userId: user.id } });
        if (!streak) {
          try {
            await ensureUserFromSupabase(user, locale);
          } catch {
            /* user ensure best-effort */
          }
          try {
            streak = await prisma.userStreak.create({
              data: {
                userId: user.id,
                currentStreak: 0,
                longestStreak: 0,
                xp: 0,
                freezeCount: 0,
                lastActivityDate: null,
              } as never,
            });
          } catch {
            streak = null as unknown as typeof streak;
          }
        }
        if (streak) {
          xp = (streak as unknown as { xp: number }).xp ?? 0;
          currentStreak = (streak as unknown as { currentStreak: number }).currentStreak ?? 0;
        }
      } catch {
        /* db not yet migrated or query failed */
      }

      // Recommended level via placement
      try {
        const lastPlacement = await prisma.placementAttempt.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });
        if (lastPlacement)
          placementRecommended = (lastPlacement as unknown as { recommendedLevel: string })
            .recommendedLevel;
      } catch {}

      // Continue where you left off — most recent progress
      try {
        const recent = await prisma.progress.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          include: { lesson: { include: { unit: { select: { title: true } } } } },
        });
        if (recent?.lesson) {
          const l = recent.lesson as unknown as {
            id: string;
            title: string;
            unit?: { title: string };
          };
          continueLesson = {
            id: l.id,
            title: l.title,
            ...(l.unit?.title ? { unitTitle: l.unit.title } : {}),
          };
        }
      } catch {}
    }
  } catch {
    /* supabase not configured */
  }

  const FALLBACK_LEVELS: { code: string; title: string }[] = [
    { code: "A1", title: "A1" },
    { code: "A2", title: "A2" },
    { code: "B1", title: "B1" },
    { code: "B2", title: "B2" },
    { code: "C1", title: "C1" },
    { code: "C2", title: "C2" },
  ];
  const recommendedCode = pickRecommendedLevel(
    levels.length ? levels : FALLBACK_LEVELS,
    placementRecommended,
  );
  const recommendedLabel = (() => {
    if (placementRecommended) return `Continue ${placementRecommended}`;
    if (levels.length) return `Start ${recommendedCode}`;
    return t("startA1");
  })();

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-[var(--color-primary)] p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("welcome")}</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-indigo-100">{t("subtitle")}</p>
            {placementRecommended && (
              <p className="mt-2 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium backdrop-blur">
                Recommended: {placementRecommended}
              </p>
            )}
          </div>
          <Link
            href={`/levels/${recommendedCode}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            {recommendedLabel} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {/* Continue where you left off */}
      {continueLesson && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Continuar donde quedaste
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {continueLesson.title}
                {continueLesson.unitTitle ? ` · ${continueLesson.unitTitle}` : ""}
              </p>
            </div>
            <Link
              href={`/lessons/${continueLesson.id}`}
              className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              Continuar →
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <XpBar xp={xp} />
          <div className="mt-4">
            <StreakIndicator streak={currentStreak} />
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              {t("levels")}
            </h2>
            <Link
              href="/levels"
              className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
            >
              View all →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
            {(levels.length ? levels : FALLBACK_LEVELS).slice(0, 6).map((l) => {
              const isRecommended = l.code === recommendedCode;
              return (
                <Link
                  key={l.code}
                  href={`/levels/${l.code}`}
                  aria-current={isRecommended ? "true" : undefined}
                  className={
                    isRecommended
                      ? "rounded-xl bg-slate-900 p-3 text-center text-sm font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                      : "rounded-xl border bg-slate-50 p-3 text-center text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }
                >
                  {l.code}
                </Link>
              );
            })}
          </div>
          {!levels.length && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              DB empty — showing {FALLBACK_LEVELS.length} CEFR levels.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
          {t("quickActions")}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/levels/${recommendedCode}`}
            className="bg-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
          >
            {recommendedLabel} <span aria-hidden>→</span>
          </Link>
          <Link
            href="/tutor"
            className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {t("askTutor")}
          </Link>
          <Link
            href="/shop"
            className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {t("visitShop")}
          </Link>
          <Link
            href="/levels"
            className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            Browse levels
          </Link>
        </div>
      </div>
    </div>
  );
}
