import { NextRequest, NextResponse } from "next/server";
import { enrollChallenge } from "../../../../../lib/challenges/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { userId?: string } = {};
  try { body = await req.json(); } catch {}
  const userId = body.userId ?? req.headers.get("x-user-id") ?? "00000000-0000-0000-0000-000000000000";
  // opt-in guard: if preferences say challenges disabled, block
  try {
    const { prisma } = await import("../../../../../lib/db");
    const pref = await prisma.userPreferences.findUnique({ where: { userId } });
    if (pref && (pref as unknown as { challengesEnabled: boolean }).challengesEnabled === false) {
      return NextResponse.json({ error: "Challenges disabled in preferences" }, { status: 403 });
    }
  } catch {}
  try {
    const participant = await enrollChallenge(id, userId);
    return NextResponse.json({ participant });
  } catch (e) {
    const msg = String((e as Error).message);
    const status = msg.includes("not found") ? 404 : msg.includes("not active") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
