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
    const email = data.user?.email?.toLowerCase() ?? "";
    if (!uid && !email) return false;

    // Env allow-list is authoritative even when DB is available — zero-cost dev promotion.
    // Supports comma-separated list: ADMIN_EMAILS="a@b.com, c@d.com"
    const allow = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (email && allow.includes(email)) return true;

    // In dev without DB, allow-list is the only source
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("not available")) {
      return false;
    }
    if (!uid) return false;
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
