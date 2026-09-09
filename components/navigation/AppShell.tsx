import { isCurrentUserAdmin } from "@/lib/auth/requireAdmin";
import { AppShellClient } from "./AppShellClient";
import type { LearnerInfo } from "./AppSidebar";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

async function getLearnerInfo(): Promise<LearnerInfo> {
  const fallbackGuest: LearnerInfo = {
    name: "",
    levelCode: "A1",
    streakDays: 0,
    xp: 0,
    isGuest: true,
  };

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return fallbackGuest;

    const email = user.email ?? "";
    const metaName =
      (user.user_metadata as Record<string, unknown> | null)?.["name"] ??
      (user.user_metadata as Record<string, unknown> | null)?.["full_name"] ??
      (user.user_metadata as Record<string, unknown> | null)?.["fullName"] ??
      null;

    let displayName: string | null = null;
    let streakDays = 0;
    let xp = 0;
    let levelCode = "A1";

    // Best-effort DB fetch — each query isolated so pooler timeout never breaks the shell
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, email: true },
      });
      if (dbUser?.name) displayName = dbUser.name;
    } catch {
      // DB unavailable — ignore
    }

    if (!displayName) {
      if (typeof metaName === "string" && metaName.trim()) displayName = metaName.trim();
      else if (email) displayName = email.split("@")[0] ?? email;
      else displayName = "Learner";
    }

    try {
      const streak = await prisma.userStreak.findUnique({
        where: { userId: user.id },
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
        where: { userId: user.id },
        include: {
          lesson: { include: { unit: { include: { level: true } } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
      const withLevel =
        progresses.find((p) => p.lesson?.unit?.level?.code && p.status === "completed") ??
        progresses.find((p) => p.lesson?.unit?.level?.code);
      const code = withLevel?.lesson?.unit?.level?.code;
      if (code) levelCode = code;
    } catch {
      // pooler timeout → fallback A1
    }

    // Final fallback: ensure levelCode is valid CEFR
    const valid = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
    if (!valid.has(levelCode)) levelCode = "A1";

    return {
      name: displayName || "Learner",
      levelCode,
      streakDays,
      xp,
      isGuest: false,
    };
  } catch {
    return fallbackGuest;
  }
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  let isAdmin = false;
  try {
    isAdmin = await isCurrentUserAdmin();
  } catch {
    isAdmin = false;
  }

  let learner: LearnerInfo;
  try {
    learner = await getLearnerInfo();
  } catch {
    learner = { name: "", levelCode: "A1", streakDays: 0, xp: 0, isGuest: true };
  }

  return (
    <AppShellClient isAdmin={isAdmin} learner={learner}>
      {children}
    </AppShellClient>
  );
}
