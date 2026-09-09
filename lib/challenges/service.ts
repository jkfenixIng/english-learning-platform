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
      await tx.userStreak
        .upsert({
          where: { userId },
          update: { xp: { increment: challenge.rewardXp } },
          create: { userId, xp: challenge.rewardXp, currentStreak: 1, longestStreak: 1 } as never,
        })
        .catch(() => {});
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

// Scheduler stub: rotate daily/weekly challenges; called by Vercel Cron route
export async function schedulerTick(now = new Date()) {
  // idempotent: ensures at least one active daily challenge exists
  const active = await prisma.challenge.findMany({
    where: { type: "daily", startAt: { lte: now }, endAt: { gte: now } },
  });
  if (active.length === 0) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const title = `Daily Sprint — ${now.toISOString().slice(0, 10)}`;
    const exists = await prisma.challenge.findFirst({ where: { title } });
    if (!exists) {
      await prisma.challenge.create({
        data: {
          id: crypto.randomUUID(),
          type: "daily",
          title,
          description: "Complete 5 exercises today",
          rule: { metric: "exercises", count: 5 } as never,
          startAt: new Date(now.setHours(0, 0, 0, 0)),
          endAt: tomorrow,
          rewardXp: 30,
        } as never,
      });
    }
  }
  return { checkedAt: now.toISOString() };
}
