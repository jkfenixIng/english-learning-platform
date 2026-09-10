"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LessonEditor } from "./LessonEditor";
import { AdminGuide } from "./AdminGuide";

type LessonRow = {
  id: string;
  title: string;
  orderIndex: number;
  kind: string;
  coverImage: string | null;
  unit: { title: string; level: { code: string } | null } | null;
};

type SortKey = "order" | "title" | "level" | "kind";
type SortDir = "asc" | "desc";

function kindBadge(kind: string) {
  const k = kind ?? "teach";
  const map: Record<string, string> = {
    teach: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    practice: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
    quiz: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    exam: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  };
  return map[k] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800";
}

export function LessonsAdminClient({ initialLessons }: { initialLessons: LessonRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newParam = searchParams.get("new");
  const editId = searchParams.get("edit");
  const showNew = newParam !== null;

  const [lessons, setLessons] = useState<LessonRow[]>(initialLessons);
  const [msg, setMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<LessonRow | null>(null);

  // filters / sort / pagination
  const [q, setQ] = useState("");
  const [filterKind, setFilterKind] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [hovered, setHovered] = useState<string | null>(null);

  const handleSaved = async () => {
    router.push("/admin/lessons");
    router.refresh();
    try {
      const res = await fetch("/api/admin/lessons?take=50");
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
    setMsg("Eliminando…");
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setLessons((prev) => prev.filter((l) => l.id !== id));
      setMsg("Eliminada ✓");
      setConfirmDelete(null);
    } catch (e) {
      setMsg("Error: " + String(e));
    }
  };

  const handleDuplicate = async (row: LessonRow) => {
    setMsg("Duplicando…");
    try {
      // fetch full lesson then POST as new
      const res = await fetch(`/api/admin/lessons/${row.id}`);
      if (!res.ok) throw new Error("No se pudo leer lección");
      const data = await res.json();
      const payload = {
        unitId: data.unitId,
        title: `${data.title} (copia)`,
        objectives: data.objectives,
        orderIndex: (data.orderIndex ?? row.orderIndex) + 1,
        estimatedMinutes: data.estimatedMinutes ?? 10,
        kind: data.kind ?? row.kind,
        coverImage: data.coverImage ?? undefined,
        bodyMarkdown: data.bodyMarkdown ?? undefined,
        content: data.content ?? { blocks: [] },
      };
      const create = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!create.ok) throw new Error(await create.text());
      const created = await create.json();
      setMsg("Duplicada ✓ — " + created.id);
      handleSaved();
    } catch (e) {
      setMsg("Error duplicando: " + String(e instanceof Error ? e.message : e));
    }
  };

  const filtered = useMemo(() => {
    let arr = [...lessons];
    if (q.trim()) {
      const low = q.toLowerCase();
      arr = arr.filter(
        (l) =>
          l.title.toLowerCase().includes(low) ||
          l.unit?.title.toLowerCase().includes(low) ||
          l.unit?.level?.code.toLowerCase().includes(low),
      );
    }
    if (filterKind) arr = arr.filter((l) => l.kind === filterKind);
    if (filterLevel) arr = arr.filter((l) => l.unit?.level?.code === filterLevel);
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "level")
        cmp = (a.unit?.level?.code ?? "").localeCompare(b.unit?.level?.code ?? "");
      else if (sortKey === "kind") cmp = a.kind.localeCompare(b.kind);
      else cmp = a.orderIndex - b.orderIndex;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [lessons, q, filterKind, filterLevel, sortKey, sortDir]);

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

  const levels = useMemo(() => {
    const s = new Set<string>();
    lessons.forEach((l) => {
      if (l.unit?.level?.code) s.add(l.unit.level.code);
    });
    return Array.from(s).sort();
  }, [lessons]);

  return (
    <div className="space-y-4">
      <AdminGuide />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Lecciones — CRUD visual</h1>
          <p className="text-xs text-slate-500">
            Busca, filtra, previsualiza al pasar el cursor y gestiona sin código. {filtered.length}{" "}
            resultados.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/lessons?new=1")}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <span aria-hidden>＋</span> Crear lección
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute top-2.5 left-3 text-slate-400" aria-hidden>
            🔍
          </span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por título, unidad o level…"
            className="w-full rounded-xl border bg-slate-50 py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-800"
            aria-label="Buscar lecciones"
          />
        </div>
        <select
          value={filterKind}
          onChange={(e) => {
            setFilterKind(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos los tipos</option>
          <option value="teach">Teach</option>
          <option value="practice">Practice</option>
          <option value="quiz">Quiz</option>
          <option value="exam">Exam</option>
        </select>
        <select
          value={filterLevel}
          onChange={(e) => {
            setFilterLevel(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="Filtrar por level"
        >
          <option value="">Todos los niveles</option>
          {levels.map((lv) => (
            <option key={lv} value={lv}>
              {lv}
            </option>
          ))}
        </select>
        <select
          value={`${sortKey}-${sortDir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split("-") as [SortKey, SortDir];
            setSortKey(k);
            setSortDir(d);
          }}
          className="rounded-xl border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="Ordenar"
        >
          <option value="order-asc">Orden ↑</option>
          <option value="order-desc">Orden ↓</option>
          <option value="title-asc">Título A-Z</option>
          <option value="title-desc">Título Z-A</option>
          <option value="level-asc">Level A-Z</option>
          <option value="kind-asc">Tipo A-Z</option>
        </select>
        {q || filterKind || filterLevel ? (
          <button
            onClick={() => {
              setQ("");
              setFilterKind("");
              setFilterLevel("");
              setPage(1);
            }}
            className="rounded-xl border px-3 py-2 text-xs hover:bg-slate-50 dark:border-slate-700"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {msg ? (
        <p
          className="rounded-xl border bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-100"
          aria-live="polite"
        >
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Lecciones">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs dark:bg-slate-800/50">
                <th className="px-3 py-2.5">
                  <button
                    onClick={() => toggleSort("level")}
                    className="inline-flex items-center gap-1 hover:text-indigo-600"
                  >
                    Level {sortKey === "level" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </button>
                </th>
                <th className="px-3 py-2.5">Unidad</th>
                <th className="px-3 py-2.5">
                  <button
                    onClick={() => toggleSort("title")}
                    className="inline-flex items-center gap-1 hover:text-indigo-600"
                  >
                    Título {sortKey === "title" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </button>
                </th>
                <th className="px-3 py-2.5">
                  <button
                    onClick={() => toggleSort("kind")}
                    className="inline-flex items-center gap-1 hover:text-indigo-600"
                  >
                    Tipo {sortKey === "kind" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-center">
                  <button onClick={() => toggleSort("order")} className="hover:text-indigo-600">
                    Orden {sortKey === "order" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((l) => (
                <tr
                  key={l.id}
                  onMouseEnter={() => setHovered(l.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-3 py-2.5 font-mono text-xs">{l.unit?.level?.code ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{l.unit?.title ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.title}</span>
                      {hovered === l.id && l.coverImage ? (
                        <span className="hidden overflow-hidden rounded-lg border bg-white shadow-lg sm:inline-flex dark:border-slate-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.coverImage} alt="" className="h-12 w-20 object-cover" />
                        </span>
                      ) : null}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{l.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${kindBadge(l.kind)}`}
                    >
                      {l.kind ?? "teach"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs">{l.orderIndex}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => router.push(`/admin/lessons?edit=${l.id}`)}
                        title="Editar lección"
                        className="inline-flex items-center gap-1 rounded-xl border bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                      >
                        ✏️ <span className="hidden sm:inline">Editar</span>
                      </button>
                      <button
                        onClick={() => handleDuplicate(l)}
                        title="Duplicar lección"
                        className="inline-flex items-center gap-1 rounded-xl border bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                      >
                        📋 <span className="hidden sm:inline">Duplicar</span>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(l)}
                        title="Eliminar lección"
                        className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300"
                      >
                        🗑️ <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="mx-auto max-w-md space-y-3">
                      <p className="text-3xl" aria-hidden>
                        📚
                      </p>
                      <p className="font-medium">Sin lecciones que mostrar</p>
                      <p className="text-xs text-slate-500">
                        {q || filterKind || filterLevel
                          ? "Prueba limpiando filtros o cambiando la búsqueda."
                          : "Crea la primera lección con el editor visual — sin JSON, con preview en vivo."}
                      </p>
                      <div className="flex justify-center gap-2">
                        {q || filterKind || filterLevel ? (
                          <button
                            onClick={() => {
                              setQ("");
                              setFilterKind("");
                              setFilterLevel("");
                            }}
                            className="rounded-xl border px-3 py-2 text-xs dark:border-slate-700"
                          >
                            Limpiar filtros
                          </button>
                        ) : null}
                        <button
                          onClick={() => router.push("/admin/lessons?new=1")}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                        >
                          ＋ Crear lección ahora
                        </button>
                      </div>
                      <details className="rounded-xl border bg-slate-50 p-3 text-left text-xs dark:border-slate-700 dark:bg-slate-800">
                        <summary className="cursor-pointer font-semibold">
                          ¿Cómo creo mi primera lección?
                        </summary>
                        <ol className="mt-2 list-decimal space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                          <li>Pulsa &quot;Crear lección&quot; → elige Level y Unit.</li>
                          <li>Escribe Título y Objectives (con ayuda contextual).</li>
                          <li>
                            Añade bloques: Heading, Paragraph, Video (YouTube auto-embed) y usa
                            &quot;Ver cómo queda&quot;.
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

        {/* Pagination */}
        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/30">
            <span className="text-slate-500">
              Mostrando {(safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length} · página{" "}
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
            Mostrando {filtered.length} lecciones · usa búsqueda y filtros arriba para refinar
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold">¿Eliminar lección?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              &quot;{confirmDelete.title}&quot; se eliminará permanentemente. Esta acción no se
              puede deshacer.
            </p>
            <p className="mt-2 font-mono text-[11px] text-slate-400">{confirmDelete.id}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
