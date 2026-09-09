import { prisma } from "../../../../../lib/db";
import { LessonsAdminClient } from "../../../../../components/admin/LessonsAdminClient";

export default async function AdminLessonsPage() {
  let lessons: {
    id: string;
    title: string;
    orderIndex: number;
    kind: string;
    coverImage: string | null;
    unit: { title: string; level: { code: string } | null } | null;
  }[] = [];
  try {
    const rows = await prisma.lesson.findMany({
      orderBy: { orderIndex: "asc" },
      take: 20,
      include: { unit: { include: { level: true } } },
    });
    lessons = rows.map((r) => ({
      id: r.id,
      title: r.title,
      orderIndex: r.orderIndex,
      kind: (r as unknown as { kind: string }).kind ?? "teach",
      coverImage: (r as unknown as { coverImage: string | null }).coverImage ?? null,
      unit: r.unit
        ? { title: r.unit.title, level: r.unit.level ? { code: r.unit.level.code } : null }
        : null,
    }));
  } catch {
    lessons = [];
  }
  return <LessonsAdminClient initialLessons={lessons as never} />;
}
