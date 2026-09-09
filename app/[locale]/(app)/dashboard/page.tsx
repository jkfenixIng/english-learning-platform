import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "../../../../lib/db";
import { createClient } from "../../../../lib/supabase/server";
import { XpBar } from "../../../../components/gamification/XpBar";
import { StreakIndicator } from "../../../../components/gamification/StreakIndicator";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  let levels: { code: string; title: string }[] = [];
  try {
    levels = await prisma.level.findMany({ orderBy: { orderIndex: "asc" } });
  } catch {
    /* db not yet migrated */
  }

  // Real gamification state - never mock. New users start at Level 1 (0 XP) and 0 streak.
  let xp = 0;
  let currentStreak = 0;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      try {
        let streak = await prisma.userStreak.findUnique({ where: { userId: user.id } });
        if (!streak) {
          // Guard: first read for a new Supabase user - ensure User row exists (FK) then create zeroed streak.
          // Values per spec: currentStreak=0, longestStreak=0, lastActivityDate=null, freezeCount=0, xp=0 -> Level 1
          try {
            const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
            if (!existingUser) {
              await prisma.user.create({
                data: {
                  id: user.id,
                  email: user.email ?? `${user.id}@example.com`,
                  name: (user.user_metadata as Record<string, unknown> | undefined)?.name as string | undefined ?? user.email?.split("@")[0] ?? "Learner",
                  locale,
                } as never,
              });
            }
          } catch {
            /* user ensure best-effort - FK may still fail, fallback to zero UI */
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
            // Race or DB unavailable / FK violation - keep streak null and render 0
            streak = null as unknown as typeof streak;
          }
        }
        if (streak) {
          xp = (streak as unknown as { xp: number }).xp ?? 0;
          currentStreak = (streak as unknown as { currentStreak: number }).currentStreak ?? 0;
        }
      } catch {
        /* db not yet migrated or query failed - fallback to 0 */
      }
    }
  } catch {
    /* supabase not configured - fallback to 0 */
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-[var(--color-primary)] p-6 text-white">
        <h1 className="text-2xl font-bold">{t("welcome")}</h1>
        <p className="text-indigo-100">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
          <XpBar xp={xp} />
          <div className="mt-3">
            <StreakIndicator streak={currentStreak} />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
          <h2 className="font-semibold">{t("levels")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(levels.length
              ? levels
              : [
                  { code: "A1", title: "A1" },
                  { code: "A2", title: "A2" },
                ]
            ).map((l) => (
              <Link
                key={l.code}
                href={`/levels/${l.code}`}
                className="rounded-lg bg-indigo-50 p-3 text-center text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
              >
                {l.code}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
        <h2 className="font-semibold">{t("quickActions")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/levels/A1"
            className="bg-primary rounded px-4 py-2 text-sm text-white hover:opacity-90"
          >
            {t("startA1")}
          </Link>
          <Link href="/tutor" className="rounded border px-4 py-2 text-sm">
            {t("askTutor")}
          </Link>
          <Link href="/shop" className="rounded border px-4 py-2 text-sm">
            {t("visitShop")}
          </Link>
        </div>
      </div>
    </div>
  );
}
