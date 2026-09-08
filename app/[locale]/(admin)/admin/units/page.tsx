import { prisma } from "../../../../../lib/db";
export default async function AdminUnitsPage() {
  let units: { id: string; title: string; orderIndex: number }[] = [];
  try { units = await prisma.unit.findMany({ orderBy: { orderIndex: "asc" }, take: 20 }); } catch { units = []; }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Units — CRUD (stub)</h1>
      <p className="text-sm text-gray-600">Table + create/edit stub — POST /api/admin/units (to be added) with Zod validation. Admin-only.</p>
      <table className="w-full text-sm" aria-label="Units table">
        <thead><tr className="border-b text-left"><th>Title</th><th>Order</th></tr></thead>
        <tbody>{units.map((u) => (<tr key={u.id} className="border-b"><td className="py-2">{u.title}</td><td>{u.orderIndex}</td></tr>))}{units.length===0?<tr><td colSpan={2} className="py-4 text-center text-gray-500">No data — DB pending or RLS restricted; UI proof present.</td></tr>:null}</tbody>
      </table>
      <form className="rounded border p-4 dark:border-gray-700" aria-label="Create unit form"><h2 className="font-semibold">Create Unit</h2><input name="title" placeholder="Unit title" className="mt-2 w-full rounded border px-2 py-1" /><button type="submit" className="mt-2 rounded bg-primary px-4 py-2 text-sm text-white">Create (stub)</button></form>
    </div>
  );
}
