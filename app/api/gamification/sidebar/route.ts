import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const fallbackGuest = {
    name: "",
    levelCode: "A1",
    streakDays: 0,
    xp: 0,
    isGuest: true,
  };

  let userId: string | null = null;
  let email: string | null = null;
  let metaName: string | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return NextResponse.json({ learner: fallbackGuest });
    userId = user.id;
    email = user.email ?? null;
    const meta = user.user_metadata as Record<string, unknown> | null;
    const raw = meta?.["name"] ?? meta?.["full_name"] ?? meta?.["fullName"] ?? null;
    if (typeof raw === "string" && raw.trim()) metaName = raw.trim();
  } catch {
    return NextResponse.json({ learner: fallbackGuest });
  }

  if (!userId) return NextResponse.json({ learner: fallbackGuest });

  let displayName: string | null = null;
  let streakDays = 0;
  let xp = 0;
  let levelCode = "A1";

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (dbUser?.name) displayName = dbUser.name;
  } catch {
    // ignore
  }

  if (!displayName) {
    if (metaName) displayName = metaName;
    else if (email) displayName = email.split("@")[0] ?? email;
    else displayName = "Learner";
  }

  try {
    const streak = await prisma.userStreak.findUnique({
      where: { userId },
      select: { currentStreak: true, xp: true },
    });
    if (streak) {
      streakDays = streak.currentStreak ?? 0;
      xp = streak.xp ?? 0;
    }
  } catch {
    // keep 0
  }

  try {
    const progresses = await prisma.progress.findMany({
      where: { userId },
      include: { lesson: { include: { unit: { include: { level: true } } } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    const withLevel =
      progresses.find((p) => p.lesson?.unit?.level?.code && p.status === "completed") ??
      progresses.find((p) => p.lesson?.unit?.level?.code);
    const code = withLevel?.lesson?.unit?.level?.code;
    if (code) levelCode = code;
  } catch {
    // fallback A1 on pooler timeout
  }

  const valid = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
  if (!valid.has(levelCode)) levelCode = "A1";

  return NextResponse.json({
    learner: { name: displayName, levelCode, streakDays, xp, isGuest: false },
  });
}
