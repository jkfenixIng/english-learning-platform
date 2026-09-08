import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import "../../../../../lib/exercises/init";
import { getPlugin } from "../../../../../lib/exercises/registry";
import { computeXp } from "../../../../../lib/gamification/xp";
import { shouldAutoCreate } from "../../../../../lib/srs/dal";
import { invalidateLeaderboard } from "../../../../../lib/gamification/leaderboard";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { answer: unknown; timeSpentMs?: number; userId?: string };
  try {
    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    const plugin = getPlugin(exercise.type as never);
    if (!plugin) return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    // validate answer
    plugin.answerSchema.parse(body.answer);
    const result = plugin.evaluate(exercise.prompt as never, exercise.solution as never, body.answer as never);
    const userId = body.userId ?? "00000000-0000-0000-0000-000000000000";
    // try persist - if db not ready, still return score
    let attemptId: string | undefined;
    try {
      const attempt = await prisma.attempt.create({
        data: { id: crypto.randomUUID(), userId, exerciseId: id, answer: body.answer as never, score: result.score, feedback: { text: result.feedback } as never, timeSpentMs: body.timeSpentMs ?? 0 },
      });
      attemptId = attempt.id;
      const xp = computeXp({ difficulty: exercise.difficulty });
      await prisma.userStreak.upsert({
        where: { userId },
        update: { xp: { increment: xp }, lastActivityDate: new Date() },
        create: { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: new Date(), xp },
      }).catch(() => {});
      await prisma.progress.upsert({
        where: { userId_lessonId: { userId, lessonId: exercise.lessonId } },
        update: { bestScore: result.score, status: result.score >= 70 ? "completed" : "in_progress" },
        create: { id: crypto.randomUUID(), userId, lessonId: exercise.lessonId, status: result.score >= 70 ? "completed" : "in_progress", bestScore: result.score },
      }).catch(() => {});
      // SRS: auto-create card for flashcards or low scores if srsEnabled
      try {
        const pref = await prisma.userPreferences.findUnique({ where: { userId } });
        if (!pref || (pref as unknown as { srsEnabled: boolean }).srsEnabled !== false) {
          if (shouldAutoCreate(exercise.type, Number(result.score))) {
            const today = new Date().toISOString().slice(0,10);
            await prisma.srsCard.upsert({ where: { userId_exerciseId: { userId, exerciseId: id } as never }, update: {}, create: { id: crypto.randomUUID(), userId, exerciseId: id, dueDate: new Date(today), interval: 0, easeFactor: 2.5, repetitions: 0, lapses: 0 } as never }).catch(()=>{});
          }
        }
      } catch {}
      // Challenges: bump progress for active enrollments
      try {
        const enrolls = await prisma.challengeParticipant.findMany({ where: { userId, completed: false } });
        if (enrolls.length) {
          const streak = await prisma.userStreak.findUnique({ where: { userId } });
          const stats = { exercises: 1, xp, streak: streak?.currentStreak ?? 0, lessons: 0 }; // incremental, real aggregation would sum
          for (const p of enrolls) {
            const { updateProgress } = await import("../../../../../lib/challenges/service");
            const challenge = await prisma.challenge.findUnique({ where: { id: p.challengeId } });
            if (!challenge) continue;
            const prog = await import("../../../../../lib/challenges/rules").then(m => m.progressForRule((challenge.rule as never) ?? { count: 5 }, stats));
            // naive: increment current; keep simple without overwriting heavy logic
            const cur = (p.progress as unknown as { current?: number })?.current ?? 0;
            const target = (prog as unknown as { target: number }).target;
            const nextCurrent = Math.min(target, cur + 1);
            const completed = nextCurrent >= target;
            await prisma.challengeParticipant.update({ where: { id: p.id }, data: { progress: { current: nextCurrent, target } as never, completed, completedAt: completed ? new Date() : null } as never }).catch(()=>{});
            if (completed && challenge.rewardXp > 0) {
              await prisma.userStreak.update({ where: { userId }, data: { xp: { increment: challenge.rewardXp } } }).catch(()=>{});
            }
          }
        }
      } catch {}
      invalidateLeaderboard();
    } catch { /* db not ready */ }
    return NextResponse.json({ ...result, attemptId, xpAwarded: computeXp({ difficulty: exercise.difficulty }) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
