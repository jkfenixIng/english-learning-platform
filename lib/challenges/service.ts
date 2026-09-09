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
  const prog = progressForRule((challenge.rule as ChallengeRule) ?? { count: 5 }, stats);
  const completed = !!prog.completed;
  const updated = await prisma.challengeParticipant.update({
    where: { id: participant.id },
    data: {
      progress: prog as never,
      completed,
      completedAt: completed ? new Date() : null,
    } as never,
  });
  if (completed && challenge.rewardXp > 0) {
    await prisma.userStreak
      .upsert({
        where: { userId },
        update: { xp: { increment: challenge.rewardXp } },
        create: { userId, xp: challenge.rewardXp, currentStreak: 1, longestStreak: 1 } as never,
      })
      .catch(() => {});
    await prisma.notification
      .create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: "challenge_completed",
          payload: { challengeId, rewardXp: challenge.rewardXp } as never,
        } as never,
      })
      .catch(() => {});
  }
  return updated;
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
