import Link from "next/link";
import { isCurrentUserAdmin } from "../../../lib/auth/requireAdmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-bold text-red-600">403 — Admin only</h1>
        <p className="text-sm text-gray-600">This area is restricted to users with role admin. Student RLS is strict; admin bypass is via service role only.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-indigo-600 underline">Back to dashboard</Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 dark:bg-gray-900 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/admin" className="font-bold text-indigo-600">Admin Panel</Link>
          <nav className="flex flex-wrap gap-3 text-sm" aria-label="Admin navigation">
            <Link href="/admin" className="underline">Overview</Link>
            <Link href="/admin/levels">Levels</Link>
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
