import Link from "next/link";
import { prisma } from "../../../../../lib/db";
import { NavigationToggle } from "../../../../../components/cefr/NavigationToggle";

export default async function LevelPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let level: { title: string; description: string } | null = null;
  let units: { id: string; title: string; description: string; orderIndex: number }[] = [];
  try {
    const l = await prisma.level.findUnique({ where: { code: code as never }, include: { units: { orderBy: { orderIndex: "asc" } } } });
    if (l) { level = l; units = l.units; }
  } catch {}

  if (!level) {
    return <div className="space-y-4"><NavigationToggle /><p className="text-sm text-gray-500">Level {code} — seed not yet run. Showing placeholder.</p><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded border bg-white p-4 dark:bg-gray-900"><p className="font-medium">Unit {i + 1}</p><p className="text-sm text-gray-500">Placeholder unit</p><Link href="#" className="text-sm text-indigo-600">View lessons →</Link></div>)}</div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">{level.title}</h1><NavigationToggle /></div>
      <p className="text-sm text-gray-600">{level.description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {units.map((u) => (
          <Link key={u.id} href={`/units/${u.id}`} className="rounded-xl border bg-white p-4 hover:shadow dark:bg-gray-900">
            <p className="font-medium">{u.orderIndex}. {u.title}</p>
            <p className="text-sm text-gray-500">{u.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
