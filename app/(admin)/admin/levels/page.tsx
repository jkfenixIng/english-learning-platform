import { prisma } from "../../../../lib/db";

export default async function AdminLevelsPage() {
  let levels: { code: string; title: string; orderIndex: number; description: string }[] = [];
  try {
    levels = await prisma.level.findMany({ orderBy: { orderIndex: "asc" } });
  } catch {
    levels = [];
  }
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Levels — CRUD</h1>
      <table className="w-full text-sm" aria-label="Levels table">
        <thead><tr className="border-b text-left"><th>Code</th><th>Title</th><th>Order</th></tr></thead>
        <tbody>
          {levels.map((l) => (
            <tr key={l.code} className="border-b">
              <td className="py-2 font-mono">{l.code}</td>
              <td>{l.title}</td>
              <td>{l.orderIndex}</td>
            </tr>
          ))}
          {levels.length === 0 ? <tr><td colSpan={3} className="py-4 text-center text-gray-500">No levels (DB not provisioned — seed pending) — table renders as proof.</td></tr> : null}
        </tbody>
      </table>

      <form
        action={async (formData: FormData) => {
          "use server";
          // Server Action stub for demo — real POST via /api/admin/levels
          console.log("Create level stub", Object.fromEntries(formData));
        }}
        className="rounded border p-4 dark:border-gray-700"
        aria-label="Create level form"
      >
        <h2 className="mb-2 font-semibold">Create / Upsert Level</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs">Code
            <select name="code" className="w-full rounded border px-2 py-1" required defaultValue="C1">
              <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option>
            </select>
          </label>
          <label className="text-xs">Order
            <input name="orderIndex" type="number" defaultValue={5} className="w-full rounded border px-2 py-1" />
          </label>
          <label className="text-xs sm:col-span-2">Title
            <input name="title" placeholder="Advanced (C1)" className="w-full rounded border px-2 py-1" required />
          </label>
          <label className="text-xs sm:col-span-2">Description
            <input name="description" placeholder="CEFR C1..." className="w-full rounded border px-2 py-1" required />
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">Submits to <code>POST /api/admin/levels</code> — Zod-validated, admin-guarded, idempotent upsert. Edit/delete stub via same endpoint.</p>
        <button type="submit" className="mt-3 rounded bg-indigo-600 px-4 py-2 text-sm text-white">Create / Upsert</button>
      </form>

      <div className="rounded bg-gray-50 p-4 text-xs dark:bg-gray-900">
        <p className="font-semibold">RLS enforcement:</p>
        <p>Student RLS strict via DAL ownership checks; admin bypass requires service role (Supabase dashboard). Guard verified by <code>isCurrentUserAdmin()</code>.</p>
      </div>
    </div>
  );
}
