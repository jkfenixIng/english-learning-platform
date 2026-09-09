"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LessonEditor } from "./LessonEditor";

type LessonRow = {
  id: string;
  title: string;
  orderIndex: number;
  kind: string;
  coverImage: string | null;
  unit: { title: string; level: { code: string } | null } | null;
};

export function LessonsAdminClient({ initialLessons }: { initialLessons: LessonRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newParam = searchParams.get("new");
  const editId = searchParams.get("edit");
  const showNew = newParam !== null;
  const [lessons, setLessons] = useState<LessonRow[]>(initialLessons);
  const [msg, setMsg] = useState("");

  const handleSaved = async () => {
    router.push("/admin/lessons");
    router.refresh();
    // refetch
    try {
      const res = await fetch("/api/admin/lessons?take=20");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.lessons;
        if (Array.isArray(arr))
          setLessons(
            arr.map((l: LessonRow & { unit: LessonRow["unit"] }) => ({
              id: l.id,
              title: l.title,
              orderIndex: l.orderIndex,
              kind: l.kind,
              coverImage: l.coverImage,
              unit: l.unit,
            })),
          );
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar lección? Esta acción no se puede deshacer.")) return;
    setMsg("Eliminando...");
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setLessons((prev) => prev.filter((l) => l.id !== id));
      setMsg("Eliminada ✓");
    } catch (e) {
      setMsg("Error: " + String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Lessons — CRUD real</h1>
        <button
          onClick={() => router.push("/admin/lessons?new=1")}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Crear lección
        </button>
      </div>
      {msg ? (
        <p className="text-sm text-slate-600" aria-live="polite">
          {msg}
        </p>
      ) : null}

      {showNew || editId ? (
        <LessonEditor
          lessonId={editId}
          onSaved={handleSaved}
          onCancel={() => router.push("/admin/lessons")}
        />
      ) : null}

      <div className="overflow-x-auto rounded border bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm" aria-label="Lessons table">
          <thead>
            <tr className="border-b bg-slate-50 text-left dark:bg-slate-800">
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr
                key={l.id}
                className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="px-3 py-2 font-mono text-xs">{l.unit?.level?.code ?? "-"}</td>
                <td className="px-3 py-2 text-xs">{l.unit?.title ?? "-"}</td>
                <td className="px-3 py-2 font-medium">{l.title}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                    {l.kind ?? "teach"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">{l.orderIndex}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => router.push(`/admin/lessons?edit=${l.id}`)}
                      className="rounded border px-2 py-1 text-xs hover:bg-white dark:border-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:bg-red-950/20"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {lessons.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                  No lessons — crea la primera con “Crear lección” (sin JSON).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Paginación: mostrando {lessons.length} lecciones (take 20). Usa Crear/Editar con editor
        visual — videos YouTube se ven como iframe en la lección.
      </p>
    </div>
  );
}
