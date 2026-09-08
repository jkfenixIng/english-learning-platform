import Link from "next/link";
import { prisma } from "../../../../../lib/db";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let lesson: { title: string; objectives: string; exercises: { id: string; type: string; difficulty: number }[] } | null = null;
  try {
    lesson = await prisma.lesson.findUnique({ where: { id }, include: { exercises: true } });
  } catch {}
  if (!lesson) return <p className="text-sm text-gray-500">Lesson not found.</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{lesson.title}</h1>
      <p className="text-sm text-gray-600">{lesson.objectives}</p>
      <div className="space-y-2">
        {lesson.exercises.map((ex, idx) => (
          <Link key={ex.id} href={`/exercises/${ex.id}`} className="flex items-center justify-between rounded border bg-white p-3 hover:bg-gray-50 dark:bg-gray-900">
            <span className="text-sm">#{idx + 1} {ex.type} (difficulty {ex.difficulty})</span>
            <span className="rounded bg-indigo-600 px-3 py-1 text-xs text-white">Practice</span>
          </Link>
        ))}
        {lesson.exercises.length === 0 ? <p className="text-sm text-gray-500">No exercises yet.</p> : null}
      </div>
    </div>
  );
}
