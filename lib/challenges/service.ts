import { prisma } from "../db";
import { progressForRule } from "./rules";
import type { ChallengeRule } from "./rules";

export async function ensureUserExistsForChallenge(
  userId: string,
  email?: string | null,
  name?: string | null,
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;
  if (!email) throw new Error("User not synchronized — please sign in again");
  try {
    return await prisma.user.create({
      data: { id: userId, email, name: name ?? email.split("@")[0] ?? "Learner" } as never,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      const again = await prisma.user.findUnique({ where: { id: userId } });
      if (again) return again;
    }
    throw e;
  }
}

export async function enrollChallenge(challengeId: string, userId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new Error("Challenge not found");
  const now = new Date();
  if (now < challenge.startAt || now > challenge.endAt) throw new Error("Challenge not active");
  const existing = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } as never },
  });
  if (existing) return existing;
  try {
    return await prisma.challengeParticipant.create({
      data: {
        id: crypto.randomUUID(),
        challengeId,
        userId,
        progress: { current: 0 } as never,
        completed: false,
      } as never,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    // P2003 = FK violation (e.g. users.id missing), P2002 = unique violation (race)
    if (code === "P2003") {
      throw new Error("User not synchronized — please sign in again");
    }
    if (code === "P2002") {
      const again = await prisma.challengeParticipant.findUnique({
        where: { challengeId_userId: { challengeId, userId } as never },
      });
      if (again) return again;
    }
    throw e;
  }
}

export async function updateProgress(
  challengeId: string,
  userId: string,
  stats: { exercises?: number; xp?: number; streak?: number; lessons?: number },
) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new Error("Challenge not found");
  const participant = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } as never },
  });
  if (!participant) throw new Error("Not enrolled");
  if (participant.completed) return participant;
  // Validate temporal window — only advance progress inside active window
  const now = new Date();
  if (now < challenge.startAt || now > challenge.endAt) {
    // Outside window we keep current progress but don't mark completed
    const prog = progressForRule((challenge.rule as ChallengeRule) ?? { count: 5 }, stats);
    // Don't complete if window closed before reaching target; just update current without awarding
    if (now > challenge.endAt) return participant;
    const completed = !!prog.completed;
    // If still inside window allow update; if before start, don't advance (return)
    if (now < challenge.startAt) return participant;
    if (!completed) {
      return prisma.challengeParticipant.update({
        where: { id: participant.id },
        data: { progress: prog as never } as never,
      });
    }
  }
  const prog = progressForRule((challenge.rule as ChallengeRule) ?? { count: 5 }, stats);
  const completed = !!prog.completed;
  // Transaction ensures idempotent reward — check completed again inside tx
  if (completed && challenge.rewardXp > 0) {
    return prisma.$transaction(async (tx) => {
      const fresh = await tx.challengeParticipant.findUnique({ where: { id: participant.id } });
      if (!fresh) throw new Error("Not enrolled");
      if (fresh.completed) return fresh;
      const updated = await tx.challengeParticipant.update({
        where: { id: participant.id },
        data: {
          progress: prog as never,
          completed: true,
          completedAt: new Date(),
        } as never,
      });
      try {
        await tx.$executeRawUnsafe(
          `INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, xp, coins, freeze_count)
           VALUES ($1::uuid, 1, 1, $2, $2, 0)
           ON CONFLICT (user_id) DO UPDATE SET xp = public.user_streaks.xp + $2, coins = public.user_streaks.coins + $2`,
          userId,
          challenge.rewardXp,
        );
      } catch {
        await tx.userStreak
          .upsert({
            where: { userId },
            update: { xp: { increment: challenge.rewardXp } },
            create: { userId, xp: challenge.rewardXp, currentStreak: 1, longestStreak: 1 } as never,
          })
          .catch(() => {});
      }
      await tx.notification
        .create({
          data: {
            id: crypto.randomUUID(),
            userId,
            type: "challenge_completed",
            payload: { challengeId, rewardXp: challenge.rewardXp } as never,
          } as never,
        })
        .catch(() => {});
      return updated;
    });
  }
  const updated = await prisma.challengeParticipant.update({
    where: { id: participant.id },
    data: {
      progress: prog as never,
      completed,
      completedAt: completed ? new Date() : null,
    } as never,
  });
  return updated;
}

export async function leaveChallenge(challengeId: string, userId: string) {
  const participant = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } as never },
  });
  if (!participant) {
    const err = new Error("Not enrolled") as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  if (participant.completed) {
    const err = new Error("Challenge already completed — cannot leave") as Error & {
      status?: number;
    };
    err.status = 409;
    throw err;
  }
  await prisma.challengeParticipant.delete({ where: { id: participant.id } });
  return { left: true };
}

export async function getActiveChallenges(now = new Date()) {
  return prisma.challenge.findMany({
    where: { startAt: { lte: now }, endAt: { gte: now } },
    orderBy: { startAt: "asc" },
  });
}

export async function getUserChallenges(userId: string) {
  return prisma.challengeParticipant.findMany({ where: { userId }, include: { challenge: true } });
}

/**
 * Background job helper — retry with exponential backoff, 0 USD (no queue infra).
 * Used for scheduler and any async op that should survive transient DB hiccups.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; baseMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseMs = opts?.baseMs ?? 200;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      const delay = baseMs * 2 ** attempt + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
      console.error(
        `[withRetry] attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`,
        e,
      );
    }
  }
  throw lastErr;
}

async function ensureChallengeType(type: "daily" | "weekly" | "timed" | "streak", now: Date) {
  const { defaultChallengeWindows } = await import("./rules");
  const { startAt, endAt } = defaultChallengeWindows(type, now);
  const active = await prisma.challenge.findMany({
    where: { type, startAt: { lte: now }, endAt: { gte: now } },
  });
  if (active.length > 0) return { type, created: false, count: active.length };
  // Avoid duplicate title race
  const titles: Record<string, string> = {
    daily: `Daily Sprint — ${now.toISOString().slice(0, 10)}`,
    weekly: `Weekly Marathon — ${now.toISOString().slice(0, 10)}`,
    timed: `Timed Sprint — ${now.toISOString().slice(0, 10)}`,
    streak: `Streak Keeper — ${now.toISOString().slice(0, 10)}`,
  };
  const descriptions: Record<string, string> = {
    daily: "Complete 5 exercises today",
    weekly: "Complete 25 exercises this week",
    timed: "Complete 10 exercises before midnight",
    streak: "Keep a 3-day streak",
  };
  const rules: Record<string, unknown> = {
    daily: { metric: "exercises", count: 5 },
    weekly: { metric: "exercises", count: 25 },
    timed: { metric: "exercises", count: 10 },
    streak: { metric: "streak", count: 3 },
  };
  const rewards: Record<string, number> = { daily: 30, weekly: 100, timed: 50, streak: 50 };
  const title = titles[type]!;
  const exists = await prisma.challenge.findFirst({ where: { title } as never });
  if (exists) return { type, created: false, count: 0 };
  await withRetry(() =>
    prisma.challenge.create({
      data: {
        id: crypto.randomUUID(),
        type,
        title,
        description: descriptions[type],
        rule: rules[type] as never,
        startAt,
        endAt,
        rewardXp: rewards[type],
      } as never,
    }),
  );
  return { type, created: true, count: 1 };
}

// Scheduler: rotate daily/weekly/timed/streak challenges; called by Vercel Cron route
// Idempotent — safe to run via multiple cron schedules or manual POST.
export async function schedulerTick(now = new Date()) {
  const results: Record<string, unknown> = {};
  // Daily is mandatory; weekly/timed/streak are opportunistic (if no active)
  for (const type of ["daily", "weekly", "timed", "streak"] as const) {
    try {
      results[type] = await ensureChallengeType(type, new Date(now));
    } catch (e) {
      console.error(`[schedulerTick] ${type} failed`, e);
      results[type] = { error: String(e) };
    }
  }
  // Competitive challenges are manual/admin-only — do not auto-create
  return { checkedAt: now.toISOString(), results };
}
