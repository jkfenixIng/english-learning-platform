import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "../../../lib/gamification/leaderboard";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const windowParam = (searchParams.get("window") as "weekly" | "all_time") ?? "all_time";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const w = windowParam === "weekly" ? "weekly" : "all_time";
  const entries = await getLeaderboard(w, limit);
  return NextResponse.json({ window: w, entries }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } });
}
