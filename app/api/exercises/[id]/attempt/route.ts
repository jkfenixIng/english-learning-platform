import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import "../../../../../lib/exercises/init";
import { getPlugin } from "../../../../../lib/exercises/registry";
import { computeXp } from "../../../../../lib/gamification/xp";

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
      // XP + streak stub
      const xp = computeXp({ difficulty: exercise.difficulty });
      await prisma.userStreak.upsert({
        where: { userId },
        update: { xp: { increment: xp }, lastActivityDate: new Date() },
        create: { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: new Date(), xp },
      }).catch(() => {});
      // progress
      await prisma.progress.upsert({
        where: { userId_lessonId: { userId, lessonId: exercise.lessonId } },
        update: { bestScore: result.score, status: result.score >= 70 ? "completed" : "in_progress" },
        create: { id: crypto.randomUUID(), userId, lessonId: exercise.lessonId, status: result.score >= 70 ? "completed" : "in_progress", bestScore: result.score },
      }).catch(() => {});
    } catch { /* db not ready */ }
    return NextResponse.json({ ...result, attemptId, xpAwarded: computeXp({ difficulty: exercise.difficulty }) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
