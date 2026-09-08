import { prisma } from "../../../../lib/db";
export default async function AdminLessonsPage() {
  let lessons: { id: string; title: string; orderIndex: number }[] = [];
  try { lessons = await prisma.lesson.findMany({ orderBy: { orderIndex: "asc" }, take: 20 }); } catch { lessons = []; }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Lessons — CRUD (stub)</h1>
      <p className="text-sm text-gray-600">Table + create/edit stub; validates via <code>lessonSchema</code>; admin-only.</p>
      <table className="w-full text-sm" aria-label="Lessons table">
        <thead><tr className="border-b text-left"><th>Title</th><th>Order</th></tr></thead>
        <tbody>{lessons.map((l)=>(<tr key={l.id} className="border-b"><td className="py-2">{l.title}</td><td>{l.orderIndex}</td></tr>))}{lessons.length===0?<tr><td colSpan={2} className="py-4 text-center text-gray-500">No lessons — UI proof.</td></tr>:null}</tbody>
      </table>
      <form className="rounded border p-4 dark:border-gray-700" aria-label="Create lesson form"><h2 className="font-semibold">Create Lesson</h2><input name="title" placeholder="Lesson title" className="mt-2 w-full rounded border px-2 py-1" /><button type="submit" className="mt-2 rounded bg-indigo-600 px-4 py-2 text-sm text-white">Create (stub)</button></form>
    </div>
  );
}
