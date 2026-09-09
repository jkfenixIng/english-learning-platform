import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { prisma } from "../../../../lib/db";

export async function POST(_req: NextRequest) {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {
    // fallback to demo id if supabase misconfigured (zero-cost envs)
  }
  if (!userId) userId = "00000000-0000-0000-0000-000000000000";

  const today = new Date().toISOString().slice(0, 10);

  try {
    // Find a few exercises to create demo cards from (prefer flashcard/matching)
    const exercises = await prisma.exercise.findMany({
      take: 5,
      orderBy: { createdAt: "asc" },
    });

    let toCreate = exercises;
    if (!toCreate.length) {
      // No exercises at all — create a placeholder lesson+exercise on the fly if possible
      // Try to find any lesson
      const lesson = await prisma.lesson.findFirst();
      if (lesson) {
        const ex = await prisma.exercise.create({
          data: {
            id: crypto.randomUUID(),
            lessonId: lesson.id,
            type: "flashcard",
            difficulty: 2,
            prompt: { front: "Hello", back: "Hola", hint: "Greeting" },
            solution: { text: "Hola" },
          } as never,
        });
        toCreate = [ex as never];
      }
    }

    if (!toCreate.length) {
      return NextResponse.json(
        { error: "No lesson/exercise to seed demo from. Run seed first." },
        { status: 400 },
      );
    }

    let created = 0;
    for (const ex of toCreate.slice(0, 3)) {
      const eid = (ex as unknown as { id: string }).id;
      try {
        await prisma.srsCard.upsert({
          where: { userId_exerciseId: { userId, exerciseId: eid } as never },
          update: { dueDate: new Date(today) } as never,
          create: {
            id: crypto.randomUUID(),
            userId,
            exerciseId: eid,
            dueDate: new Date(today),
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
          } as never,
        });
        created += 1;
      } catch {
        // ignore individual failures
      }
    }

    if (created === 0) {
      return NextResponse.json({ error: "Could not create demo cards" }, { status: 400 });
    }

    return NextResponse.json({ created });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
