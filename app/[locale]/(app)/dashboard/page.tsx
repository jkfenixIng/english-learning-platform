import Link from "next/link";
import { prisma } from "../../../../lib/db";
import { XpBar } from "../../../../components/gamification/XpBar";
import { StreakIndicator } from "../../../../components/gamification/StreakIndicator";

export default async function DashboardPage() {
  let levels: { code: string; title: string }[] = [];
  try {
    levels = await prisma.level.findMany({ orderBy: { orderIndex: "asc" } });
  } catch {
    /* db not yet migrated */
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-[var(--color-primary)] p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-indigo-100">Continue your English journey</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
          <XpBar xp={120} />
          <div className="mt-3">
            <StreakIndicator streak={3} />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
          <h2 className="font-semibold">Levels</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(levels.length
              ? levels
              : [
                  { code: "A1", title: "A1" },
                  { code: "A2", title: "A2" },
                ]
            ).map((l) => (
              <Link
                key={l.code}
                href={`/levels/${l.code}`}
                className="rounded-lg bg-indigo-50 p-3 text-center text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
              >
                {l.code}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
        <h2 className="font-semibold">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/levels/A1"
            className="bg-primary rounded px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Start A1
          </Link>
          <Link href="/tutor" className="rounded border px-4 py-2 text-sm">
            Ask Tutor
          </Link>
          <Link href="/shop" className="rounded border px-4 py-2 text-sm">
            Visit Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
