import { prisma } from "../../../../../lib/db";
import ExerciseRunner from "./ExerciseRunner";

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let exercise: { id: string; type: string; prompt: unknown; solution: unknown; lessonId: string } | null = null;
  try {
    exercise = await prisma.exercise.findUnique({ where: { id } });
  } catch {}
  if (!exercise) return <p className="text-sm text-gray-500">Exercise not found.</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{exercise.type} — exercise</p>
      <ExerciseRunner exercise={exercise as never} />
    </div>
  );
}
