import Link from "next/link";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <p className="text-sm text-gray-600">Manage catalog, run idempotent seed, and review users (read-only PII).</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li><Link className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-900" href="/admin/levels">Levels / Units / Lessons — CRUD</Link></li>
        <li><Link className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-900" href="/admin/exercises">Exercises (13 types) — CRUD</Link></li>
        <li><Link className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-900" href="/admin/challenges">Challenges — CRUD</Link></li>
        <li><Link className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-900" href="/admin/badges">Badges / Certificates — CRUD</Link></li>
        <li><Link className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-900" href="/admin/shop">Shop items — CRUD</Link></li>
        <li><Link className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-900" href="/admin/users">Users (read-only PII)</Link></li>
      </ul>
    </div>
  );
}
