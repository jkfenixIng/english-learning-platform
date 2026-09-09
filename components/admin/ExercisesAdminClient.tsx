"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExerciseEditor } from "./ExerciseEditor";

type ExRow = { id: string; type: string; difficulty: number; lessonId: string; assets?: unknown };

export function ExercisesAdminClient({ initialExercises }: { initialExercises: ExRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const showNew = searchParams.get("new") !== null;
  const [exercises, setExercises] = useState<ExRow[]>(initialExercises);
  const [filterType, setFilterType] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [msg, setMsg] = useState("");

  const filtered = exercises.filter((e) => {
    if (filterType && e.type !== filterType) return false;
    return true;
  });

  const handleSaved = async () => {
    router.push("/admin/exercises");
    router.refresh();
    try {
      const res = await fetch("/api/admin/exercises?take=30");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.exercises ?? data);
        if (Array.isArray(arr)) setExercises(arr);
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar ejercicio?")) return;
    setMsg("Eliminando...");
    try {
      const res = await fetch(`/api/admin/exercises/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setExercises((prev) => prev.filter((e) => e.id !== id));
      setMsg("Eliminado ✓");
    } catch (e) {
      setMsg("Error: " + String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Exercises — CRUD (sin JSON crudo)</h1>
        <button
          onClick={() => router.push("/admin/exercises?new=1")}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + Crear ejercicio
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">Todos los tipos</option>
          {[
            "fill_blanks",
            "ordering",
            "transformation",
            "flashcard",
            "matching",
            "listening_tts",
            "dictation",
            "comprehension",
            "graded_reading",
            "writing_prompt",
            "speaking_record",
            "shadowing",
            "pronunciation",
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {filterLevel ? (
          <span className="self-center text-xs">Filtro level futuro (via lesson.unit)</span>
        ) : null}
      </div>

      {msg ? (
        <p className="text-sm" aria-live="polite">
          {msg}
        </p>
      ) : null}

      {showNew || editId ? (
        <ExerciseEditor
          exerciseId={editId}
          onSaved={handleSaved}
          onCancel={() => router.push("/admin/exercises")}
        />
      ) : null}

      <div className="overflow-x-auto rounded border bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-xs" aria-label="Exercises table">
          <thead>
            <tr className="border-b bg-slate-50 text-left dark:bg-slate-800">
              <th className="px-2 py-1">ID</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Diff</th>
              <th className="px-2 py-1">Lesson</th>
              <th className="px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr
                key={e.id}
                className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="px-2 py-1 font-mono text-[10px]">{e.id.slice(0, 8)}</td>
                <td className="px-2 py-1">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                    {e.type}
                  </span>
                </td>
                <td className="px-2 py-1 text-center">{e.difficulty}</td>
                <td className="px-2 py-1 font-mono text-[10px]">{e.lessonId.slice(0, 8)}</td>
                <td className="px-2 py-1">
                  <div className="flex gap-1">
                    <button
                      onClick={() => router.push(`/admin/exercises?edit=${e.id}`)}
                      className="rounded border px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-950/20"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No exercises — crea uno con formularios por tipo (sin JSON).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Lista con filtros por type — preview del JSON generado visible en el editor. Imágenes con
        preview local.
      </p>
    </div>
  );
}
