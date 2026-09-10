"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExerciseEditor } from "./ExerciseEditor";
import { AdminGuide } from "./AdminGuide";

type ExRow = {
  id: string;
  type: string;
  difficulty: number;
  lessonId: string;
  assets?: unknown;
  lesson?: { title: string } | null;
};

type SortKey = "type" | "difficulty" | "id";
type SortDir = "asc" | "desc";

export function ExercisesAdminClient({ initialExercises }: { initialExercises: ExRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const showNew = searchParams.get("new") !== null;
  const [exercises, setExercises] = useState<ExRow[]>(initialExercises);
  const [filterType, setFilterType] = useState("");
  const [q, setQ] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [msg, setMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ExRow | null>(null);
  const [preview, setPreview] = useState<ExRow | null>(null);
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/lessons?take=100");
        if (!res.ok) return;
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.lessons;
        if (!cancelled && Array.isArray(arr)) {
          const map: Record<string, string> = {};
          arr.forEach((l: { id: string; title: string }) => (map[l.id] = l.title));
          setLessonTitles(map);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaved = async () => {
    router.push("/admin/exercises");
    router.refresh();
    try {
      const res = await fetch("/api/admin/exercises?take=50");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.exercises ?? data);
        if (Array.isArray(arr)) setExercises(arr);
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    setMsg("Eliminando…");
    try {
      const res = await fetch(`/api/admin/exercises/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setExercises((prev) => prev.filter((e) => e.id !== id));
      setMsg("Eliminado ✓");
      setConfirmDelete(null);
    } catch (e) {
      setMsg("Error: " + String(e));
    }
  };

  const handleDuplicate = async (row: ExRow) => {
    setMsg("Duplicando…");
    try {
      const res = await fetch(`/api/admin/exercises/${row.id}`);
      if (!res.ok) throw new Error("No se pudo leer");
      const data = await res.json();
      const body = {
        lessonId: data.lessonId,
        type: data.type,
        difficulty: data.difficulty,
        prompt: data.prompt,
        solution: data.solution,
        assets: data.assets,
      };
      const create = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!create.ok) throw new Error(await create.text());
      setMsg("Duplicado ✓");
      handleSaved();
    } catch (e) {
      setMsg("Error duplicando: " + String(e instanceof Error ? e.message : e));
    }
  };

  const filtered = useMemo(() => {
    let arr = [...exercises];
    if (filterType) arr = arr.filter((e) => e.type === filterType);
    if (difficultyFilter) arr = arr.filter((e) => String(e.difficulty) === difficultyFilter);
    if (q.trim()) {
      const low = q.toLowerCase();
      arr = arr.filter(
        (e) =>
          e.type.toLowerCase().includes(low) ||
          e.id.toLowerCase().includes(low) ||
          (lessonTitles[e.lessonId]?.toLowerCase().includes(low) ?? false),
      );
    }
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else if (sortKey === "difficulty") cmp = a.difficulty - b.difficulty;
      else cmp = a.id.localeCompare(b.id);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [exercises, filterType, difficultyFilter, q, sortKey, sortDir, lessonTitles]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      <AdminGuide />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Pruebas / Ejercicios — sin JSON crudo
          </h1>
          <p className="text-xs text-slate-500">
            {filtered.length} ejercicios · Filtra por tipo/dificultad, busca por lección y
            previsualiza.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/exercises?new=1")}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          ＋ Crear ejercicio
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute top-2.5 left-3 text-slate-400" aria-hidden>
            🔍
          </span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por tipo, ID o lección…"
            className="w-full rounded-xl border bg-slate-50 py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-800"
            aria-label="Buscar ejercicios"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
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
        <select
          value={difficultyFilter}
          onChange={(e) => {
            setDifficultyFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">Todas las dificultades</option>
          <option value="1">1 — Fácil</option>
          <option value="2">2</option>
          <option value="3">3 — Media</option>
          <option value="4">4</option>
          <option value="5">5 — Difícil</option>
        </select>
        <select
          value={`${sortKey}-${sortDir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split("-") as [SortKey, SortDir];
            setSortKey(k);
            setSortDir(d);
          }}
          className="rounded-xl border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="id-desc">Más recientes</option>
          <option value="type-asc">Tipo A-Z</option>
          <option value="difficulty-asc">Dificultad ↑</option>
          <option value="difficulty-desc">Dificultad ↓</option>
        </select>
        {q || filterType || difficultyFilter ? (
          <button
            onClick={() => {
              setQ("");
              setFilterType("");
              setDifficultyFilter("");
              setPage(1);
            }}
            className="rounded-xl border px-3 py-2 text-xs dark:border-slate-700"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {msg ? (
        <p
          className="rounded-xl border bg-amber-50 px-3 py-2 text-sm dark:border-amber-900/30 dark:bg-amber-950/20"
          aria-live="polite"
        >
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

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Ejercicios">
            <thead>
              <tr className="border-b bg-slate-50 text-left dark:bg-slate-800/50">
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">
                  <button onClick={() => toggleSort("type")} className="hover:text-indigo-600">
                    Tipo {sortKey === "type" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-center">
                  <button
                    onClick={() => toggleSort("difficulty")}
                    className="hover:text-indigo-600"
                  >
                    Dif. {sortKey === "difficulty" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </button>
                </th>
                <th className="px-3 py-2.5">Lección</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((e) => (
                <tr
                  key={e.id}
                  className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-3 py-2.5 font-mono text-[11px]">{e.id.slice(0, 8)}…</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">
                      {e.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${e.difficulty >= 4 ? "bg-red-100 text-red-700" : e.difficulty <= 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {e.difficulty}
                    </span>
                  </td>
                  <td
                    className="max-w-[180px] truncate px-3 py-2.5 font-mono text-[11px]"
                    title={lessonTitles[e.lessonId] ?? e.lessonId}
                  >
                    {lessonTitles[e.lessonId] ?? e.lessonId.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setPreview(e)}
                        title="Preview"
                        className="rounded-xl border bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => router.push(`/admin/exercises?edit=${e.id}`)}
                        className="rounded-xl border bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDuplicate(e)}
                        className="rounded-xl border bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => setConfirmDelete(e)}
                        className="rounded-xl bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-950/30"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <div className="mx-auto max-w-md space-y-3">
                      <p className="text-3xl">🧩</p>
                      <p className="font-medium">Sin ejercicios</p>
                      <p className="text-xs text-slate-500">
                        {q || filterType
                          ? "No hay resultados con esos filtros."
                          : "Crea el primero con formularios por tipo — sin JSON manual."}
                      </p>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => router.push("/admin/exercises?new=1")}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                        >
                          ＋ Crear ejercicio
                        </button>
                      </div>
                      <details className="rounded-xl border bg-slate-50 p-3 text-left text-xs dark:border-slate-700 dark:bg-slate-800">
                        <summary className="cursor-pointer font-semibold">
                          ¿Cómo creo un ejercicio?
                        </summary>
                        <ol className="mt-2 list-decimal space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                          <li>
                            Elige tipo (ej. fill_blanks) y busca tu lección por título (selector con
                            búsqueda).
                          </li>
                          <li>Completa el formulario del tipo — campos con ayuda.</li>
                          <li>
                            Usa &quot;Preview real&quot; para ver cómo lo ve el estudiante y guarda.
                          </li>
                        </ol>
                      </details>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/30">
            <span className="text-slate-500">
              Mostrando {(safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length} · pág{" "}
              {safePage}/{totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border bg-white px-3 py-1 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              >
                ← Anterior
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border bg-white px-3 py-1 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              >
                Siguiente →
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
            Mostrando {filtered.length} ejercicios
          </div>
        )}
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold">¿Eliminar ejercicio?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Tipo {confirmDelete.type} — {confirmDelete.id.slice(0, 8)}. No se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl border bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Preview — {preview.type}</h3>
              <button
                onClick={() => setPreview(null)}
                className="rounded-full border px-2 py-1 text-xs dark:border-slate-700"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              {preview.id} · dif {preview.difficulty} · lección{" "}
              {lessonTitles[preview.lessonId] ?? preview.lessonId.slice(0, 8)}
            </p>
            <div className="mt-3 rounded-xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold">Datos del ejercicio</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Abre el editor para ver el render real por tipo. Este hover muestra IDs y mapeo.
              </p>
              <pre className="mt-2 max-h-60 overflow-auto rounded bg-white p-2 text-[11px] dark:bg-slate-900">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => {
                setPreview(null);
                router.push(`/admin/exercises?edit=${preview.id}`);
              }}
              className="mt-3 w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white"
            >
              ✏️ Editar este ejercicio
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
