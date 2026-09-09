#!/usr/bin/env tsx
/**
 * Promote a user to admin by email.
 * Usage:
 *   npx tsx scripts/promote-admin.ts tu@email.com
 *   npm run admin:promote -- tu@email.com
 *   npm run admin:promote -- tu@email.com --demote   # revert to student
 *
 * Requires DATABASE_URL. User must already exist in public.users
 * (created on first login via Supabase Auth + ensureUserExists).
 * The id in public.users must match auth.users.id (FK).
 */

import { prisma } from "../lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function printHelp() {
  console.log(`
Usage: npx tsx scripts/promote-admin.ts <email> [--demote] [--role <role>]

  <email>           User email to promote (required)
  --demote          Revert to 'student' instead of 'admin'
  --role <role>     Explicit role: admin | student (default: admin)
  --help, -h        Show this help

Examples:
  npx tsx scripts/promote-admin.ts tu@email.com
  npm run admin:promote -- tu@email.com
  npx tsx scripts/promote-admin.ts tu@email.com --demote

Notes:
  - The user must already exist in public.users. If not found, ask them to
    sign in once via /login or /register so ensureUserExists creates the row.
    The row id must equal auth.users.id (FK). For quick dev access you can also
    set ADMIN_EMAILS="tu@email.com" in .env (no DB change needed).
  - For production you can also run directly:
      psql $DATABASE_URL -c "UPDATE users SET role='admin' WHERE email='tu@email.com'"
    or use Supabase SQL Editor with the same query.
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printHelp();
    if (args.length === 0) {
      console.error("\nError: email is required.");
      process.exit(1);
    }
    process.exit(0);
  }

  // Parse email (first non-flag arg)
  const emailArg = args.find((a) => !a.startsWith("-"));
  const isDemote = args.includes("--demote");
  const roleIdx = args.indexOf("--role");
  let targetRole = "admin";
  if (isDemote) targetRole = "student";
  if (roleIdx !== -1 && args[roleIdx + 1]) {
    const v = args[roleIdx + 1]!.toLowerCase();
    if (v === "admin" || v === "student") targetRole = v;
    else {
      console.error(`Error: --role must be 'admin' or 'student', got '${v}'`);
      process.exit(1);
    }
  }

  const email = emailArg?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    console.error(`Error: invalid email '${emailArg ?? ""}'. Expected like tu@email.com`);
    printHelp();
    process.exit(1);
  }

  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("not available")) {
    console.error("Error: DATABASE_URL is not set or is placeholder.");
    console.error("Set DATABASE_URL in .env to your Postgres/Supabase connection string.");
    console.error("For dev without DB you can use ADMIN_EMAILS instead (see .env.example).");
    process.exit(1);
  }

  console.log(`Looking up user with email: ${email} ...`);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!existing) {
    console.error(`\nUser not found in public.users for email: ${email}`);
    console.error(`
This usually means the user has never signed in, so no row was created in
public.users (id must equal auth.users.id — created by ensureUserExists on login).

Fix:
  1) Ask the user to sign in once via /login or /register (creates the row).
  2) Then re-run: npx tsx scripts/promote-admin.ts ${email}
  3) Alternative (dev only, zero DB touch): set ADMIN_EMAILS="${email}" in .env
     and restart dev server — requireAdmin.ts allows that email without DB change.
  4) Or create the row manually if you have the auth user id:
     psql $DATABASE_URL -c "INSERT INTO users (id, email, name, role) VALUES ('<auth-uid>', '${email}', 'Admin', 'admin') ON CONFLICT (id) DO UPDATE SET role='admin';"
`);
    process.exit(2);
  }

  if (existing.role === targetRole) {
    console.log(
      `User ${existing.email} (${existing.id}) already has role='${targetRole}'. No change.`,
    );
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(
    `Updating ${existing.email} (${existing.id}) role: '${existing.role}' -> '${targetRole}' ...`,
  );

  const updated = await prisma.user.update({
    where: { email },
    data: { role: targetRole },
    select: { id: true, email: true, name: true, role: true },
  });

  console.log(`Done. User ${updated.email} is now role='${updated.role}'.`);
  console.log(JSON.stringify(updated, null, 2));
  console.log(`
Verify:
  psql $DATABASE_URL -c "SELECT id, email, role FROM users WHERE email='${email}';"
Then sign out and sign in again (or refresh) to pick up the new role.
Admin panel: /admin (also /es/admin, /en/admin)
`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Unexpected error:", err);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
