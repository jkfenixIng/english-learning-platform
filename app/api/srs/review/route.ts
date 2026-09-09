import { NextRequest, NextResponse } from "next/server";
import { reviewCard } from "../../../../lib/srs/dal";
import { checkRateLimit, getClientKey, rateLimitHeaders } from "../../../../lib/rate-limit";

export async function POST(req: NextRequest) {
  let body: { cardId?: string; quality?: number; userId?: string };
  try {
    body = (await req.json()) as { cardId?: string; quality?: number; userId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Rate limiting — 60 reviews/min per IP+user
  const rlOpts = { limit: 60, windowMs: 60_000 };
  const rlKey = `srs:${getClientKey(req, body.userId ?? null)}`;
  const rl = checkRateLimit(rlKey, rlOpts);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests — slow down" },
      { status: 429, headers: rateLimitHeaders(rl, rlOpts) },
    );
  }
  if (!body.cardId || body.quality === undefined)
    return NextResponse.json({ error: "cardId and quality required" }, { status: 400 });
  const q = Number(body.quality);
  if (!Number.isInteger(q) || q < 0 || q > 5)
    return NextResponse.json({ error: "quality must be 0-5" }, { status: 400 });

  // SRS opt-in guard
  const userId = body.userId ?? "00000000-0000-0000-0000-000000000000";
  try {
    const { prisma } = await import("../../../../lib/db");
    const pref = await prisma.userPreferences.findUnique({ where: { userId } });
    if (pref && (pref as unknown as { srsEnabled: boolean }).srsEnabled === false) {
      return NextResponse.json({ error: "SRS disabled in preferences" }, { status: 403 });
    }
  } catch {}

  const today = new Date().toISOString().slice(0, 10);
  try {
    const updated = await reviewCard(body.cardId, q, today);
    return NextResponse.json({ card: updated });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 404 });
  }
}
