import Link from "next/link";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-bold text-red-600 dark:text-red-400">403 — Admin only</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This area is restricted to users with{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">role=&apos;admin&apos;</code>.
          Students cannot view or access any admin route. To gain access, ask an existing admin to
          promote you, or use{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">ADMIN_EMAILS</code> (dev) or{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
            npx tsx scripts/promote-admin.ts tu@email.com
          </code>
          .
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          If you just signed up, your row in <code>public.users</code> must exist first (sign in
          once). Then run the promote script — see README &quot;Crear admin&quot;.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-indigo-600 underline dark:text-indigo-400"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/admin" className="font-bold text-indigo-600">
            Admin Panel
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm" aria-label="Admin navigation">
            <Link href="/admin" className="underline">
              Overview
            </Link>
            <Link href="/admin/levels">Levels</Link>
            <Link href="/admin/units">Units</Link>
            <Link href="/admin/lessons">Lessons</Link>
            <Link href="/admin/exercises">Exercises</Link>
            <Link href="/admin/challenges">Challenges</Link>
            <Link href="/admin/badges">Badges</Link>
            <Link href="/admin/shop">Shop</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/seed">Seed</Link>
            <Link href="/dashboard">← App</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
