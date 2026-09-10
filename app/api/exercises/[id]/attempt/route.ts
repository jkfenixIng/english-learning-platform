import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import "../../../../../lib/exercises/init";
import { getPlugin } from "../../../../../lib/exercises/registry";
import { computeXp } from "../../../../../lib/gamification/xp";
import { shouldAutoCreate } from "../../../../../lib/srs/dal";
import { invalidateLeaderboard } from "../../../../../lib/gamification/leaderboard";
import { checkRateLimit, getClientKey, rateLimitHeaders } from "../../../../../lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { answer: unknown; timeSpentMs?: number; userId?: string };
  try {
    body = (await req.json()) as { answer: unknown; timeSpentMs?: number; userId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Rate limiting — 30 attempts/min per IP+user (in-memory, 0 USD)
  const rlKey = `attempt:${getClientKey(req, body.userId ?? null)}:${id}`;
  const rlOpts = { limit: 30, windowMs: 60_000 };
  const rl = checkRateLimit(rlKey, rlOpts);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests — slow down" },
      { status: 429, headers: rateLimitHeaders(rl, rlOpts) },
    );
  }
  try {
    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    const plugin = getPlugin(exercise.type as never);
    if (!plugin) return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    // validate answer
    plugin.answerSchema.parse(body.answer);
    const result = plugin.evaluate(
      exercise.prompt as never,
      exercise.solution as never,
      body.answer as never,
    );
    const userId = body.userId ?? "00000000-0000-0000-0000-000000000000";
    // try persist - if db not ready, still return score
    let attemptId: string | undefined;
    try {
      const attempt = await prisma.attempt.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          exerciseId: id,
          answer: body.answer as never,
          score: result.score,
          feedback: { text: result.feedback } as never,
          timeSpentMs: body.timeSpentMs ?? 0,
        },
      });
      attemptId = attempt.id;
      const xp = computeXp({ difficulty: exercise.difficulty });
      // XP y monedas separadas: 1 XP = 1 coin, sin usar $queryRaw para no romper deploy si columna aún no existe
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date, xp, coins, freeze_count)
           VALUES ($1::uuid, 1, 1, $2::date, $3, $3, 0)
           ON CONFLICT (user_id) DO UPDATE SET xp = public.user_streaks.xp + $3, coins = public.user_streaks.coins + $3, last_activity_date = $2::date`,
          userId,
          new Date().toISOString().slice(0, 10),
          xp,
        );
      } catch {
        // Fallback si columna coins aún no existe (migración pendiente)
        await prisma.userStreak
          .upsert({
            where: { userId },
            update: { xp: { increment: xp }, lastActivityDate: new Date() },
            create: {
              userId,
              currentStreak: 1,
              longestStreak: 1,
              lastActivityDate: new Date(),
              xp,
            },
          })
          .catch(() => {});
      }
      await prisma.progress
        .upsert({
          where: { userId_lessonId: { userId, lessonId: exercise.lessonId } },
          update: {
            bestScore: result.score,
            status: result.score >= 70 ? "completed" : "in_progress",
          },
          create: {
            id: crypto.randomUUID(),
            userId,
            lessonId: exercise.lessonId,
            status: result.score >= 70 ? "completed" : "in_progress",
            bestScore: result.score,
          },
        })
        .catch(() => {});
      // SRS: auto-create card for flashcards or low scores if srsEnabled
      try {
        const pref = await prisma.userPreferences.findUnique({ where: { userId } });
        if (!pref || (pref as unknown as { srsEnabled: boolean }).srsEnabled !== false) {
          if (shouldAutoCreate(exercise.type, Number(result.score))) {
            const today = new Date().toISOString().slice(0, 10);
            await prisma.srsCard
              .upsert({
                where: { userId_exerciseId: { userId, exerciseId: id } as never },
                update: {},
                create: {
                  id: crypto.randomUUID(),
                  userId,
                  exerciseId: id,
                  dueDate: new Date(today),
                  interval: 0,
                  easeFactor: 2.5,
                  repetitions: 0,
                  lapses: 0,
                } as never,
              })
              .catch(() => {});
          }
        }
      } catch {}
      // Challenges: update progress via lib/challenges/service.updateProgress with real stats + idempotent reward
      try {
        const enrolls = await prisma.challengeParticipant.findMany({
          where: { userId, completed: false },
          include: { challenge: true },
        });
        if (enrolls.length) {
          const now = new Date();
          // Filter to challenges whose window includes now (valid temporal window)
          const activeEnrolls = enrolls.filter((p) => {
            const ch = (p as unknown as { challenge: { startAt: Date; endAt: Date } }).challenge;
            return ch && now >= ch.startAt && now <= ch.endAt;
          });
          if (activeEnrolls.length) {
            const { updateProgress } = await import("../../../../../lib/challenges/service");
            // Pre-fetch aggregates once per user to avoid N+1 inside loop
            // We recompute per-challenge window below (each challenge may have different window)
            const streakRow = await prisma.userStreak.findUnique({ where: { userId } });
            const streakVal = streakRow?.currentStreak ?? 0;

            for (const p of activeEnrolls) {
              const challenge = (
                p as unknown as {
                  challenge: { id: string; startAt: Date; endAt: Date; rule: unknown };
                }
              ).challenge;
              if (!challenge) continue;
              // Real stats bounded by challenge window
              const exercisesCount = await prisma.attempt.count({
                where: {
                  userId,
                  createdAt: { gte: challenge.startAt, lte: challenge.endAt },
                },
              });
              // SUM xp: sum computeXp over attempts in window (join exercise difficulty)
              let xpSum = 0;
              try {
                const attemptsInWindow = await prisma.attempt.findMany({
                  where: {
                    userId,
                    createdAt: { gte: challenge.startAt, lte: challenge.endAt },
                  },
                  include: { exercise: { select: { difficulty: true } } },
                });
                for (const a of attemptsInWindow) {
                  const diff =
                    (a as unknown as { exercise: { difficulty: number } }).exercise?.difficulty ??
                    2;
                  xpSum += computeXp({ difficulty: diff });
                }
              } catch {
                xpSum = xp; // fallback to current attempt xp
              }
              // COUNT lessons completed inside window (Progress.completedAt within window)
              let lessonsCount = 0;
              try {
                lessonsCount = await prisma.progress.count({
                  where: {
                    userId,
                    status: "completed",
                    OR: [
                      { completedAt: { gte: challenge.startAt, lte: challenge.endAt } },
                      { updatedAt: { gte: challenge.startAt, lte: challenge.endAt } },
                    ],
                  },
                });
              } catch {
                lessonsCount = 0;
              }
              const stats = {
                exercises: exercisesCount,
                xp: xpSum,
                streak: streakVal,
                lessons: lessonsCount,
              };
              // Delegate to canonical service — handles completed check, transaction, and single xp award
              await updateProgress(challenge.id, userId, stats).catch(() => {});
            }
          }
        }
      } catch {}
      invalidateLeaderboard();
    } catch {
      /* db not ready */
    }
    return NextResponse.json({
      ...result,
      attemptId,
      xpAwarded: computeXp({ difficulty: exercise.difficulty }),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
