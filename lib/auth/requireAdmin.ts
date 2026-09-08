import { createClient } from "../supabase/server";
import { prisma } from "../db";

/**
 * Server-side admin guard. Returns true if current user has role admin.
 * Students receive 403 upstream. Uses Supabase auth + Prisma users table.
 * Service role bypass is only via Supabase dashboard; code enforces DAL check.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return false;
    // In dev without DB, fallback to env allow-list check
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("not available")) {
      const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase());
      const email = data.user?.email?.toLowerCase() ?? "";
      if (allow.includes(email)) return true;
      return false;
    }
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
    return user?.role === "admin";
  } catch {
    return false;
  }
}

export async function requireAdminOrThrow(): Promise<void> {
  const ok = await isCurrentUserAdmin();
  if (!ok) throw new Error("FORBIDDEN_ADMIN_ONLY");
}
