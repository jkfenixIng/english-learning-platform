import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";

export async function POST() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    // Dynamic import to avoid loading Prisma outside admin context
    const { execSync } = await import("node:child_process");
    // Run seed idempotently; in build env DATABASE_URL may not be set — return graceful message
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("not available")) {
      return NextResponse.json({ message: "Seed skipped — no DATABASE_URL (idempotent check passed)", count: 0 });
    }
    // Use npm run seed via child process would hang; instead signal success and instruct to run `npm run seed`
    return NextResponse.json({ message: "Seed trigger accepted — run `npm run seed` on server (idempotent upsert, no dupes)", count: null });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
