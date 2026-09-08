import { prisma } from "../../../../../lib/db";
export default async function AdminBadgesPage() {
  let badges: { code: string; title: string; isPremium: boolean }[] = [];
  try { badges = await prisma.badge.findMany({ take: 30, orderBy: { code: "asc" } }); } catch { badges = []; }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Badges / Certificates — CRUD</h1>
      <p className="text-sm text-gray-600">Informal certificates only (no official PDF). Badge earned on level exam pass ≥70. Premium badge <code>c2_distinction</code> shows paywall placeholder for non-premium.</p>
      <table className="w-full text-sm" aria-label="Badges table"><thead><tr className="border-b text-left"><th>Code</th><th>Title</th><th>Premium</th></tr></thead><tbody>{badges.map(b=>(<tr key={b.code} className="border-b"><td className="py-2 font-mono">{b.code}</td><td>{b.title}</td><td>{b.isPremium ? "Yes (paywall)" : "No"}</td></tr>))}{badges.length===0?<tr><td colSpan={3} className="py-4 text-center text-gray-500">No badges — DB pending; UI proof.</td></tr>:null}</tbody></table>
      <form className="rounded border p-4 dark:border-gray-700" aria-label="Create badge form"><h2 className="font-semibold">Create Badge (stub)</h2><input name="code" placeholder="c1_complete" className="mt-2 w-full rounded border px-2 py-1" /><button type="submit" className="mt-2 rounded bg-primary px-4 py-2 text-sm text-white">Create</button></form>
    </div>
  );
}
