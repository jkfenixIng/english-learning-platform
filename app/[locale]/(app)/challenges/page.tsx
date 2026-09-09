import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../lib/db";
import { createClient } from "../../../../lib/supabase/server";
import { progressForRule } from "../../../../lib/challenges/rules";
import type { ChallengeRule } from "../../../../lib/challenges/rules";
import ChallengeJoinButton from "./ChallengeJoinButton";

function ruleExplain(
  t: (key: string, vals?: Record<string, unknown>) => string,
  rule: ChallengeRule | null | undefined,
): string {
  const metric = rule?.metric ?? "exercises";
  const count = rule?.count ?? rule?.targetXp ?? rule?.streakDays ?? 5;
  if (metric === "xp") return t("ruleExplainXp", { count });
  if (metric === "streak") return t("ruleExplainStreak", { count });
  if (metric === "lessons") return t("ruleExplainLessons", { count });
  return t("ruleExplainExercises", { count });
}

function formatRange(locale: string, startAt: Date, endAt: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    return `${fmt.format(startAt)} — ${fmt.format(endAt)}`;
  } catch {
    return `${startAt.toLocaleDateString()} — ${endAt.toLocaleDateString()}`;
  }
}

export default async function ChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "challengesPage" });
  let challenges: {
    id: string;
    title: string;
    description: string;
    type: string;
    rewardXp: number;
    startAt: Date;
    endAt: Date;
    rule?: ChallengeRule | null;
  }[] = [];
  try {
    const rows = await prisma.challenge.findMany({ orderBy: { startAt: "desc" } });
    challenges = rows as never;
  } catch {}
  if (!challenges.length)
    challenges = [
      {
        id: "1",
        title: t("fallbackDailyTitle"),
        description: t("fallbackDailyDesc"),
        type: "daily",
        rewardXp: 30,
        startAt: new Date(),
        endAt: new Date(Date.now() + 86400000),
        rule: { metric: "exercises", count: 5 },
      },
      {
        id: "2",
        title: t("fallbackWeeklyTitle"),
        description: t("fallbackWeeklyDesc"),
        type: "weekly",
        rewardXp: 120,
        startAt: new Date(),
        endAt: new Date(Date.now() + 7 * 86400000),
        rule: { metric: "exercises", count: 25 },
      },
    ];

  // Hydrate participant state server-side
  let participantMap = new Map<
    string,
    { completed: boolean; progress: { current?: number; target?: number } | null }
  >();
  let statsForProgress: { exercises: number; xp: number; streak: number; lessons: number } | null =
    null;
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const parts = await prisma.challengeParticipant.findMany({ where: { userId } });
      for (const p of parts as unknown as {
        challengeId: string;
        completed: boolean;
        progress: unknown;
      }[]) {
        participantMap.set(p.challengeId, {
          completed: p.completed,
          progress: p.progress as never,
        });
      }
      // For hydrated progress bar when no explicit participant progress yet, compute live stats for active challenges
      // (fallback: will be 0 if no data)
      if (parts.length) {
        const streak = await prisma.userStreak.findUnique({ where: { userId } }).catch(() => null);
        // We do lightweight aggregates per challenge lazily in render; keep global streak for streak metric
        statsForProgress = {
          exercises: 0,
          xp: streak?.xp ?? 0,
          streak: (streak as unknown as { currentStreak?: number })?.currentStreak ?? 0,
          lessons: 0,
        };
        // Try to enrich stats with count in last 7 days for generic display (non-critical)
        try {
          const since = new Date(Date.now() - 7 * 86400000);
          const [exCount, lessonCount] = await Promise.all([
            prisma.attempt.count({ where: { userId, createdAt: { gte: since } } }).catch(() => 0),
            prisma.progress.count({ where: { userId, status: "completed" } }).catch(() => 0),
          ]);
          if (statsForProgress) {
            statsForProgress.exercises = exCount;
            statsForProgress.lessons = lessonCount;
          }
        } catch {}
      }
    }
  } catch {}

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-sm text-gray-500">{t("subtitle")}</p>

      {/* How it works */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
        <h2 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
          {t("howItWorksTitle")}
        </h2>
        <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">{t("howItWorksDesc")}</p>
        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">{t("howItWorksTypes")}</p>
      </div>

      <div className="grid gap-3">
        {challenges.map((c) => {
          const participant = participantMap.get(c.id);
          const isJoined = !!participant;
          const isCompleted = !!participant?.completed;
          const rule = (c.rule as ChallengeRule | undefined) ?? null;
          const explanation = ruleExplain(t as never, rule);
          const range = formatRange(locale, new Date(c.startAt), new Date(c.endAt));
          // Progress bar: if participant has stored progress use it, else compute via progressForRule with available stats
          let current = (participant?.progress as { current?: number } | null)?.current;
          let target = (participant?.progress as { target?: number } | null)?.target;
          let pct = 0;
          if (isJoined) {
            if (current == null || target == null) {
              const fallbackStats = statsForProgress ?? {
                exercises: 0,
                xp: 0,
                streak: 0,
                lessons: 0,
              };
              const prog = progressForRule(rule ?? { count: 5 }, fallbackStats);
              current = prog.current ?? 0;
              target = prog.target ?? 5;
            }
            const tVal = target ?? 5;
            const cVal = current ?? 0;
            pct = tVal > 0 ? Math.round((cVal / tVal) * 100) : 0;
            pct = Math.max(0, Math.min(100, pct));
          }

          return (
            <div
              key={c.id}
              className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 uppercase dark:bg-indigo-900/40 dark:text-indigo-300">
                      {t(`type_${c.type}` as never) !== `type_${c.type}`
                        ? t(`type_${c.type}` as never)
                        : c.type}
                    </span>
                    {isCompleted && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {t("completed")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium">{c.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.description}</p>
                  <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {explanation}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {range} · {t("reward", { xp: c.rewardXp })}
                  </p>
                  {isJoined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t("progressLabel", { current: current ?? 0, target: target ?? 5 })}
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full ${isCompleted ? "bg-green-500" : "bg-indigo-500"}`}
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      {isCompleted && (
                        <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                          {t("rewardEarned", { xp: c.rewardXp })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <ChallengeJoinButton
                  challengeId={c.id}
                  locale={locale}
                  initialJoined={isJoined}
                  initialCompleted={isCompleted}
                  labels={{
                    join: t("join"),
                    joining: t("joining"),
                    joined: t("joined"),
                    unauthorized: t("joinUnauthorized"),
                    alreadyEnrolled: t("alreadyEnrolled"),
                    disabled: t("disabled"),
                    genericError: t("genericError"),
                    leave: t("leave"),
                    leaving: t("leaving"),
                    leaveConfirm: t("leaveConfirm"),
                    notEnrolled: t("notEnrolled"),
                    alreadyCompleted: t("alreadyCompleted"),
                    completed: t("completed"),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
