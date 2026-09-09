import { prisma } from "../db";
import type { User } from "@supabase/supabase-js";

/**
 * Ensures a Prisma User row exists for the Supabase auth user.
 * Central helper used by dashboard, challenges, and any FK-dependent flow.
 * Returns the Prisma user id (same as auth user id).
 */
export async function ensureUserExists(opts: {
  id: string;
  email?: string | null;
  name?: string | null;
  locale?: string;
}): Promise<string> {
  const { id, email, name, locale } = opts;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (existing) return existing.id;
  const safeEmail = email ?? `${id}@example.com`;
  const safeName = name ?? safeEmail.split("@")[0] ?? "Learner";
  try {
    const created = await prisma.user.create({
      data: {
        id,
        email: safeEmail,
        name: safeName,
        locale: locale ?? "en",
      } as never,
    });
    return (created as unknown as { id: string }).id;
  } catch (e) {
    // Race: another request created it concurrently
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      const again = await prisma.user.findUnique({ where: { id } });
      if (again) return again.id;
    }
    throw e;
  }
}

/**
 * Convenience overload taking a Supabase User object.
 */
export async function ensureUserFromSupabase(
  supabaseUser: Pick<User, "id" | "email" | "user_metadata">,
  locale = "en",
): Promise<string> {
  const meta = supabaseUser.user_metadata as Record<string, unknown> | undefined;
  const name =
    (meta?.name as string | undefined) ??
    (meta?.full_name as string | undefined) ??
    supabaseUser.email?.split("@")[0] ??
    null;
  return ensureUserExists({
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    name,
    locale,
  });
}
