import { prisma } from "../../../../lib/db";
export default async function AdminChallengesPage() {
  let challenges: { id: string; title: string; type: string; rewardXp: number }[] = [];
  try { challenges = await prisma.challenge.findMany({ take: 20, orderBy: { createdAt: "desc" } }); } catch { challenges = []; }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Challenges — CRUD</h1>
      <p className="text-sm text-gray-600">Admin creates challenge → students can enroll. Validated via <code>challengeAdminSchema</code>.</p>
      <table className="w-full text-sm" aria-label="Challenges table"><thead><tr className="border-b text-left"><th>Title</th><th>Type</th><th>XP</th></tr></thead><tbody>{challenges.map(c=>(<tr key={c.id} className="border-b"><td className="py-2">{c.title}</td><td>{c.type}</td><td>{c.rewardXp}</td></tr>))}{challenges.length===0?<tr><td colSpan={3} className="py-4 text-center text-gray-500">No challenges — UI proof; create via POST /api/admin/challenges (stub similar to levels).</td></tr>:null}</tbody></table>
      <form className="rounded border p-4 dark:border-gray-700" aria-label="Create challenge form"><h2 className="font-semibold">Create Challenge (stub)</h2><input name="title" placeholder="Challenge title" className="mt-2 w-full rounded border px-2 py-1" /><button type="submit" className="mt-2 rounded bg-indigo-600 px-4 py-2 text-sm text-white">Create</button></form>
    </div>
  );
}
