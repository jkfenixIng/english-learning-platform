import Link from "next/link";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";

const NAV = [
  { href: "/admin", label: "Overview", icon: "🏠" },
  { href: "/admin/lessons", label: "Lecciones", icon: "📚" },
  { href: "/admin/exercises", label: "Pruebas", icon: "🧩" },
  { href: "/admin/levels", label: "Levels", icon: "🎯" },
  { href: "/admin/units", label: "Units", icon: "📦" },
  { href: "/admin/challenges", label: "Challenges", icon: "🏆" },
  { href: "/admin/badges", label: "Badges", icon: "🎖️" },
  { href: "/admin/shop", label: "Shop", icon: "🛍️" },
  { href: "/admin/users", label: "Usuarios", icon: "👥" },
  { href: "/admin/seed", label: "Seed", icon: "🌱" },
];

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm text-white">
              A
            </span>
            Admin Panel
            <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 sm:inline dark:bg-indigo-950 dark:text-indigo-200">
              modo guiado
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-xs sm:gap-1.5" aria-label="Admin navigation">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                title={n.label}
              >
                <span aria-hidden>{n.icon}</span>
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-white hover:bg-black dark:bg-white dark:text-slate-900"
            >
              ← App
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
