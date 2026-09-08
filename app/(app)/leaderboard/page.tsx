import { getLeaderboard } from "../../../lib/gamification/leaderboard";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const { window: w } = await searchParams;
  const windowVal = w === "weekly" ? "weekly" : "all_time";
  let entries: { userId: string; name: string; xp: number; rank: number }[] = [];
  try { entries = await getLeaderboard(windowVal as never, 20); } catch {}
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Leaderboard</h1>
      <div className="flex gap-2 text-sm">
        <a href="/leaderboard?window=all_time" className={`rounded px-3 py-1 ${windowVal==="all_time"?"bg-indigo-600 text-white":"border"}`}>All time</a>
        <a href="/leaderboard?window=weekly" className={`rounded px-3 py-1 ${windowVal==="weekly"?"bg-indigo-600 text-white":"border"}`}>Weekly</a>
        <span className="text-xs text-gray-400 self-center">cached 5 min</span>
      </div>
      <div className="rounded-xl border bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-gray-500"><th className="p-3">#</th><th>User</th><th className="p-3 text-right">XP</th></tr></thead>
          <tbody>
            {entries.length===0 ? <tr><td colSpan={3} className="p-4 text-center text-gray-500">No data yet — complete exercises to rank!</td></tr> :
              entries.map((e) => <tr key={e.userId} className="border-b last:border-0"><td className="p-3">{e.rank}</td><td className="font-medium">{e.name}</td><td className="p-3 text-right font-semibold">{e.xp}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
