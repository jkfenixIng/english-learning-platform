import { prisma } from "../../../../lib/db";
import { BadgeShare } from "../../../../components/gamification/BadgeShare";

export default async function BadgePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let badge: { code: string; title: string; description: string; icon: string; isPremium: boolean } | null = null;
  try { badge = await prisma.badge.findUnique({ where: { code } }); } catch { badge = null; }
  if (!badge) {
    // fallback demo for build without DB
    const fallback: Record<string, { title: string; description: string; icon: string }> = {
      c2_master: { title: "C2 Mastery", description: "Pass C2 exam — informal certificate (no official PDF)", icon: "🏅" },
      c1_complete: { title: "C1 Advanced", description: "Pass C1 exam", icon: "🎓" },
    };
    const f = fallback[code];
    if (!f) return <div className="p-6"><h1 className="text-lg font-bold">Badge not found</h1><p className="text-sm text-gray-500">Code: {code}</p></div>;
    badge = { code, ...f, isPremium: false };
  }
  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div className="rounded-xl border bg-white p-6 text-center dark:bg-gray-900">
        <p className="text-5xl" aria-hidden="true">{badge.icon}</p>
        <h1 className="mt-3 text-2xl font-bold">{badge.title}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{badge.description}</p>
        <p className="mt-3 text-xs text-gray-500">Informal certificate — shareable badge page. No official accreditation; see proposal scope.</p>
        {badge.isPremium ? <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">Premium badge — paywall placeholder for non-premium users.</p> : null}
      </div>
      <BadgeShare code={badge.code} title={badge.title} />
      <p className="text-xs text-gray-500">Share this page as your achievement. Badge earned on level exam pass ≥70.</p>
    </div>
  );
}
