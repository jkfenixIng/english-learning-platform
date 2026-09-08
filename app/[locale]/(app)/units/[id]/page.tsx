import Link from "next/link";
import { prisma } from "../../../../../lib/db";

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let unit: { title: string; lessons: { id: string; title: string; orderIndex: number; isQuiz: boolean; isExam: boolean }[] } | null = null;
  try {
    unit = await prisma.unit.findUnique({ where: { id }, include: { lessons: { orderBy: { orderIndex: "asc" } } } });
  } catch {}
  if (!unit) return <p className="text-sm text-gray-500">Unit not found — run seed first.</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{unit.title}</h1>
      <div className="grid gap-2">
        {unit.lessons.map((l) => (
          <Link key={l.id} href={`/lessons/${l.id}`} className="flex items-center justify-between rounded border bg-white p-3 hover:bg-gray-50 dark:bg-gray-900">
            <span className="text-sm">{l.orderIndex}. {l.title} {l.isQuiz ? "📝" : ""}{l.isExam ? "🎓" : ""}</span>
            <span className="text-xs text-indigo-600">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
