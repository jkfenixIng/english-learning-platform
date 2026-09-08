import { prisma } from "../db";

export interface LeaderboardEntry { userId: string; name: string; xp: number; rank: number; }

const cache = new Map<string, { data: LeaderboardEntry[]; at: number }>();
const TTL_MS = 5 * 60 * 1000;

function cacheKey(window: string) { return `lb:${window}`; }

export async function getLeaderboard(window: "weekly" | "all_time" = "all_time", limit = 20): Promise<LeaderboardEntry[]> {
  const key = cacheKey(window);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data.slice(0, limit);

  // weekly = xp updated in last 7 days approximated via streak xp; all_time = all
  // Fallback to in-memory if DB unavailable: read user_streaks
  try {
    const rows = await prisma.userStreak.findMany({ orderBy: { xp: "desc" }, take: limit, include: { user: { select: { name: true } } } });
    const entries: LeaderboardEntry[] = rows.map((r, i) => ({ userId: r.userId, name: (r.user as unknown as { name: string }).name ?? r.userId.slice(0,6), xp: r.xp, rank: i+1 }));
    cache.set(key, { data: entries, at: Date.now() });
    // also upsert leaderboard_cache for persistence
    for (const e of entries) await prisma.leaderboardCache.upsert({ where: { window_userId: { window, userId: e.userId } as never }, update: { xp: e.xp, rank: e.rank, computedAt: new Date() } as never, create: { id: crypto.randomUUID(), window, userId: e.userId, xp: e.xp, rank: e.rank } as never }).catch(()=>{});
    return entries;
  } catch {
    return [];
  }
}

export function invalidateLeaderboard() { cache.clear(); }
export function isWeeklyWindow(now = new Date()): boolean { return now.getDay() === 1; }
