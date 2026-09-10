"use client";

import { useEffect, useMemo, useState } from "react";
import { TeachingContent } from "@/components/lesson/TeachingContent";
import type { LessonContentBlock } from "@/lib/lesson/types";

// --- helpers ---
function youtubeEmbedPreview(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  if (raw.includes("youtube.com/embed/")) return raw;
  const m1 = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m1) return `https://www.youtube.com/embed/${m1[1]}`;
  const m2 = raw.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
  if (m2) return `https://www.youtube.com/embed/${m2[1]}`;
  const vimeo = raw.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  if (raw.includes("player.vimeo.com/video/")) return raw;
  return null;
}

type LevelOpt = { id: string; code: string; title: string; orderIndex: number };
type UnitOpt = { id: string; title: string; levelId: string; level?: { code: string } };

type Props = {
  lessonId?: string | null;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
};

const KIND_OPTIONS = [
  { value: "teach", label: "Teach (aprender)" },
  { value: "practice", label: "Practice" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
] as const;

const STEPS = [
  { id: 1, title: "Información básica", desc: "Título, unidad y detalles", icon: "📝" },
  { id: 2, title: "Contenido", desc: "Bloques visuales y video", icon: "🧱" },
  { id: 3, title: "Preview", desc: "Revisa y guarda", icon: "👁️" },
] as const;

function FieldHelp({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <span
        title={tip}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        aria-label={tip}
      >
        ?
      </span>
    </span>
  );
}

export function LessonEditor({ lessonId, onSaved, onCancel }: Props) {
  const isEdit = Boolean(lessonId);
  const [levels, setLevels] = useState<LevelOpt[]>([]);
  const [units, setUnits] = useState<UnitOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // form fields
  const [unitId, setUnitId] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [title, setTitle] = useState("");
  const [objectives, setObjectives] = useState("");
  const [kind, setKind] = useState<"teach" | "practice" | "quiz" | "exam">("teach");
  const [orderIndex, setOrderIndex] = useState(1);
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [coverImage, setCoverImage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [blocks, setBlocks] = useState<LessonContentBlock[]>([]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // inline validation
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!unitId) e.unitId = "Selecciona una Unit — obligatorio.";
    if (!title.trim() || title.trim().length < 2)
      e.title = "Título mínimo 2 caracteres. Se ve en la tarjeta de la lección.";
    if (!objectives.trim() || objectives.trim().length < 2)
      e.objectives = "Objectives mínimo 2 caracteres. Lo ve el estudiante.";
    if (orderIndex < 1 || orderIndex > 99) e.orderIndex = "Orden entre 1 y 99.";
    if (estimatedMinutes < 1 || estimatedMinutes > 180)
      e.estimatedMinutes = "Minutos entre 1 y 180.";
    if (coverImage && !/^https?:\/\/.+|^\/lesson-images\/.+/.test(coverImage.trim()))
      e.coverImage = "Usa URL https:// o ruta /lesson-images/...";
    if (videoUrl && !youtubeEmbedPreview(videoUrl))
      e.videoUrl = "URL no reconocida — usa youtube.com/watch?v=... o youtu.be/...";
    return e;
  }, [unitId, title, objectives, orderIndex, estimatedMinutes, coverImage, videoUrl]);

  const step1Valid =
    !errors.unitId &&
    !errors.title &&
    !errors.objectives &&
    !errors.orderIndex &&
    !errors.estimatedMinutes;
  const canGoNextFrom1 = step1Valid;

  // fetch levels/units
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lvlRes, unitRes] = await Promise.all([
          fetch("/api/admin/levels").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/admin/units").then((r) => (r.ok ? r.json() : [])),
        ]);
        if (!cancelled) {
          if (Array.isArray(lvlRes)) setLevels(lvlRes);
          if (Array.isArray(unitRes)) setUnits(unitRes);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // load existing lesson if edit
  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/lessons/${lessonId}`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        if (cancelled) return;
        setUnitId(data.unitId ?? "");
        setTitle(data.title ?? "");
        setObjectives(data.objectives ?? "");
        setKind((data.kind as never) ?? "teach");
        setOrderIndex(data.orderIndex ?? 1);
        setEstimatedMinutes(data.estimatedMinutes ?? 10);
        setCoverImage(data.coverImage ?? "");
        setBodyMarkdown(data.bodyMarkdown ?? "");
        const contentBlocks = data.content?.blocks;
        if (Array.isArray(contentBlocks)) {
          setBlocks(contentBlocks as LessonContentBlock[]);
          const firstVideo = (contentBlocks as LessonContentBlock[]).find(
            (b) => b.type === "video",
          ) as Extract<LessonContentBlock, { type: "video" }> | undefined;
          if (firstVideo) setVideoUrl(firstVideo.url ?? "");
        }
      } catch (e) {
        if (!cancelled) setMsg("Error loading lesson: " + String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const filteredUnits = levelFilter ? units.filter((u) => u.levelId === levelFilter) : units;
  useEffect(() => {
    if (!unitId) return;
    const u = units.find((x) => x.id === unitId);
    if (u && levelFilter !== u.levelId) {
      if (!levelFilter) setLevelFilter(u.levelId);
    }
  }, [unitId, units, levelFilter]);

  const addBlock = (type: LessonContentBlock["type"]) => {
    switch (type) {
      case "heading":
        setBlocks((prev) => [...prev, { type: "heading", text: "New heading", level: 2 }]);
        break;
      case "paragraph":
        setBlocks((prev) => [...prev, { type: "paragraph", text: "New paragraph text" }]);
        break;
      case "image":
        setBlocks((prev) => [
          ...prev,
          {
            type: "image",
            url: "https://picsum.photos/seed/demo/800/450",
            alt: "Illustration",
            caption: "",
          },
        ]);
        break;
      case "vocab":
        setBlocks((prev) => [
          ...prev,
          {
            type: "vocab",
            items: [
              {
                word: "goal",
                definition: "something you want to achieve",
                example: "My goal is to improve English.",
              },
            ],
          },
        ]);
        break;
      case "example":
        setBlocks((prev) => [
          ...prev,
          {
            type: "example",
            title: "Example",
            text: "This is an example sentence.",
            translation: "Traducción de ejemplo.",
          },
        ]);
        break;
      case "video":
        setBlocks((prev) => [
          ...prev,
          {
            type: "video",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            provider: "youtube",
          },
        ]);
        break;
      case "list":
        setBlocks((prev) => [
          ...prev,
          { type: "list", items: ["Point one", "Point two"], ordered: false },
        ]);
        break;
      case "callout":
        setBlocks((prev) => [
          ...prev,
          { type: "callout", text: "Tip: read carefully.", variant: "info" },
        ]);
        break;
    }
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[idx]!;
      next[idx] = next[target]!;
      next[target] = tmp;
      return next;
    });
  };
  const removeBlock = (idx: number) => setBlocks((prev) => prev.filter((_, i) => i !== idx));
  const updateBlock = (idx: number, patch: Partial<LessonContentBlock>) =>
    setBlocks((prev) =>
      prev.map((b, i) => (i === idx ? ({ ...b, ...patch } as LessonContentBlock) : b)),
    );

  const handleSave = async () => {
    setMsg("Guardando…");
    setLoading(true);
    try {
      let finalBlocks = [...blocks];
      const trimmedVideo = videoUrl.trim();
      if (trimmedVideo) {
        const hasVideoWithUrl = finalBlocks.some(
          (b) =>
            b.type === "video" &&
            (b as Extract<LessonContentBlock, { type: "video" }>).url === trimmedVideo,
        );
        if (!hasVideoWithUrl) {
          const videoIdx = finalBlocks.findIndex((b) => b.type === "video");
          if (videoIdx >= 0) {
            finalBlocks[videoIdx] = {
              ...(finalBlocks[videoIdx] as Extract<LessonContentBlock, { type: "video" }>),
              url: trimmedVideo,
            } as LessonContentBlock;
          } else {
            finalBlocks = [
              {
                type: "video",
                url: trimmedVideo,
                provider: trimmedVideo.includes("vimeo") ? "vimeo" : "youtube",
              },
              ...finalBlocks,
            ];
          }
        }
      }
      const payload = {
        unitId,
        title: title.trim(),
        objectives: objectives.trim(),
        orderIndex: Number(orderIndex),
        estimatedMinutes: Number(estimatedMinutes),
        kind,
        coverImage: coverImage.trim() || undefined,
        bodyMarkdown: bodyMarkdown.trim() || undefined,
        content: { blocks: finalBlocks },
      };
      if (!payload.unitId) throw new Error("Selecciona Unit");
      if (!payload.title || payload.title.length < 2) throw new Error("Title mínimo 2 chars");
      if (!payload.objectives || payload.objectives.length < 2)
        throw new Error("Objectives mínimo 2 chars");
      const url = isEdit ? `/api/admin/lessons/${lessonId}` : "/api/admin/lessons";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      setMsg("Guardado ✓ " + data.id);
      if (onSaved) onSaved(data.id);
    } catch (e) {
      setMsg("Error: " + String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  const embedPreview = youtubeEmbedPreview(videoUrl);
  const previewContent = { blocks } as { blocks: LessonContentBlock[] };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-800">
        <h2 className="text-base font-semibold">
          {isEdit ? "Editar lección" : "Crear lección"} — asistente guiado
        </h2>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border px-3 py-1 text-xs dark:border-slate-700"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      {/* Progress indicator */}
      <div className="px-4">
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(s.id as 1 | 2 | 3)}
                  className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                      : isDone
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isDone ? "bg-emerald-600 text-white" : isActive ? "bg-indigo-600 text-white" : "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100"}`}
                  >
                    {isDone ? "✓" : s.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs leading-none font-semibold">
                      {s.icon} {s.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.desc}</span>
                  </span>
                </button>
                {idx < STEPS.length - 1 ? (
                  <span className="hidden h-px w-4 bg-slate-200 sm:block dark:bg-slate-700" />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* Step 1 */}
        {step === 1 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs dark:border-indigo-900/30 dark:bg-indigo-950/20">
              <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                Paso 1 — Información básica
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Completa los campos marcados con *. Pasa el cursor sobre ? para ver para qué sirve
                cada campo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium">
                <FieldHelp tip="Filtra Units por nivel (A1, B1…). No se guarda, solo ayuda a elegir.">
                  Level (filtro)
                </FieldHelp>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">Todos los Units</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} — {l.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                <FieldHelp tip="Unidad donde aparecerá la lección. Obligatorio — sin esto no se puede guardar.">
                  Unit *
                </FieldHelp>
                <select
                  value={unitId}
                  onChange={(e) => {
                    setUnitId(e.target.value);
                    setTouched((t) => ({ ...t, unitId: true }));
                  }}
                  className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:bg-slate-900 ${touched.unitId && errors.unitId ? "border-red-300 bg-red-50 dark:border-red-800" : "border-slate-200 dark:border-slate-700"}`}
                  required
                >
                  <option value="">Selecciona Unit</option>
                  {filteredUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.title} {u.level?.code ? `(${u.level.code})` : ""}
                    </option>
                  ))}
                </select>
                {touched.unitId && errors.unitId ? (
                  <span className="mt-1 block text-[11px] text-red-600">{errors.unitId}</span>
                ) : null}
              </label>
            </div>

            <div className="grid gap-3">
              <label className="text-xs font-medium">
                <FieldHelp tip="Se muestra en la tarjeta de lección y en la lista. Ej: Lesson 1: Greetings">
                  Título *
                </FieldHelp>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTouched((t) => ({ ...t, title: true }));
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  placeholder="Lesson 1: Greetings"
                  className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:bg-slate-900 ${touched.title && errors.title ? "border-red-300 bg-red-50" : "border-slate-200 dark:border-slate-700"}`}
                />
                {touched.title && errors.title ? (
                  <span className="mt-1 block text-[11px] text-red-600">{errors.title}</span>
                ) : (
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Visible para el estudiante — sé claro y breve.
                  </span>
                )}
              </label>
              <label className="text-xs font-medium">
                <FieldHelp tip="Objetivos de aprendizaje — aparece al abrir la lección.">
                  Objectives *
                </FieldHelp>
                <textarea
                  value={objectives}
                  onChange={(e) => {
                    setObjectives(e.target.value);
                    setTouched((t) => ({ ...t, objectives: true }));
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, objectives: true }))}
                  placeholder="Objectives for A1 U1 L1 — greet and introduce"
                  rows={2}
                  className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:bg-slate-900 ${touched.objectives && errors.objectives ? "border-red-300 bg-red-50" : "border-slate-200 dark:border-slate-700"}`}
                />
                {touched.objectives && errors.objectives ? (
                  <span className="mt-1 block text-[11px] text-red-600">{errors.objectives}</span>
                ) : null}
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium">
                  <FieldHelp tip="Teach=aprender, Quiz/Exam=evaluación. Cambia color y lógica.">
                    Kind
                  </FieldHelp>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as never)}
                    className="mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium">
                  <FieldHelp tip="Orden dentro de la unidad (1=primero).">Orden</FieldHelp>
                  <input
                    type="number"
                    value={orderIndex}
                    onChange={(e) => {
                      setOrderIndex(parseInt(e.target.value || "1", 10));
                      setTouched((t) => ({ ...t, orderIndex: true }));
                    }}
                    min={1}
                    max={99}
                    className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:bg-slate-900 ${touched.orderIndex && errors.orderIndex ? "border-red-300" : "border-slate-200 dark:border-slate-700"}`}
                  />
                  {touched.orderIndex && errors.orderIndex ? (
                    <span className="text-[11px] text-red-600">{errors.orderIndex}</span>
                  ) : null}
                </label>
                <label className="text-xs font-medium">
                  <FieldHelp tip="Duración estimada — se muestra al estudiante.">Minutos</FieldHelp>
                  <input
                    type="number"
                    value={estimatedMinutes}
                    onChange={(e) => {
                      setEstimatedMinutes(parseInt(e.target.value || "10", 10));
                      setTouched((t) => ({ ...t, estimatedMinutes: true }));
                    }}
                    min={1}
                    max={180}
                    className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:bg-slate-900 ${touched.estimatedMinutes && errors.estimatedMinutes ? "border-red-300" : "border-slate-200 dark:border-slate-700"}`}
                  />
                  {touched.estimatedMinutes && errors.estimatedMinutes ? (
                    <span className="text-[11px] text-red-600">{errors.estimatedMinutes}</span>
                  ) : null}
                </label>
              </div>
            </div>

            <fieldset className="rounded-xl border p-3 dark:border-slate-700">
              <legend className="px-1 text-xs font-semibold">
                <FieldHelp tip="Imagen de portada — URL o /lesson-images/... Preview a la derecha.">
                  Cover image
                </FieldHelp>
              </legend>
              <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <div>
                  <input
                    value={coverImage}
                    onChange={(e) => {
                      setCoverImage(e.target.value);
                      setTouched((t) => ({ ...t, coverImage: true }));
                    }}
                    placeholder="https://... o /lesson-images/teaching-placeholder.png"
                    className={`w-full rounded-xl border px-2 py-2 text-xs dark:bg-slate-900 ${touched.coverImage && errors.coverImage ? "border-red-300" : "border-slate-200 dark:border-slate-700"}`}
                  />
                  {touched.coverImage && errors.coverImage ? (
                    <span className="mt-1 block text-[11px] text-red-600">{errors.coverImage}</span>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      URL http(s) o ruta local — preview a la derecha.
                    </p>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  {coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImage}
                      alt="cover preview"
                      className="aspect-[16/9] w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center p-2 text-center text-[11px] text-slate-400">
                      Sin imagen — se mostrará placeholder.
                    </div>
                  )}
                </div>
              </div>
            </fieldset>

            <div className="flex justify-between">
              <span className="self-center text-xs text-slate-500">Paso 1 de 3</span>
              <button
                type="button"
                onClick={() => {
                  setTouched({
                    unitId: true,
                    title: true,
                    objectives: true,
                    orderIndex: true,
                    estimatedMinutes: true,
                  });
                  if (!canGoNextFrom1) {
                    setMsg("Corrige los campos marcados en rojo antes de continuar.");
                    return;
                  }
                  setMsg("");
                  setStep(2);
                }}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Siguiente → Contenido
              </button>
            </div>
          </div>
        ) : null}

        {/* Step 2 */}
        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-xs dark:border-sky-900/30 dark:bg-sky-950/20">
              <p className="font-semibold text-sky-900 dark:text-sky-100">
                Paso 2 — Contenido visual
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Añade bloques sin JSON. Pega video YouTube y ve preview instantáneo. Puedes volver
                atrás sin perder datos.
              </p>
            </div>

            <fieldset className="rounded-xl border p-3 dark:border-slate-700">
              <legend className="px-1 text-xs font-semibold">
                <FieldHelp tip="Pega URL de YouTube o Vimeo — se convierte a embed.">
                  Video (YouTube / Vimeo)
                </FieldHelp>
              </legend>
              <input
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setTouched((t) => ({ ...t, videoUrl: true }));
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`w-full rounded-xl border px-2 py-2 text-xs dark:bg-slate-900 ${touched.videoUrl && errors.videoUrl ? "border-red-300 bg-red-50" : "border-slate-200 dark:border-slate-700"}`}
              />
              {touched.videoUrl && errors.videoUrl ? (
                <p className="mt-1 text-[11px] text-red-600">{errors.videoUrl}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Se convierte a embed automático. También puedes añadir bloques Video abajo.
                </p>
              )}
              {embedPreview ? (
                <div className="mt-3 overflow-hidden rounded-xl border bg-black dark:border-slate-700">
                  <div className="relative aspect-video w-full">
                    <iframe
                      src={embedPreview}
                      title="video preview"
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : null}
            </fieldset>

            <label className="block text-xs font-medium">
              <FieldHelp tip="Texto markdown opcional — aparece bajo los bloques. Puedes dejarlo vacío.">
                Body Markdown (opcional)
              </FieldHelp>
              <textarea
                value={bodyMarkdown}
                onChange={(e) => setBodyMarkdown(e.target.value)}
                rows={3}
                placeholder="Texto en markdown — opcional si usas bloques."
                className="mt-1 w-full rounded-xl border px-2 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </label>

            <div className="space-y-3 rounded-xl border p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Bloques visuales — sin JSON</h3>
                <span className="text-[11px] text-slate-500">{blocks.length} bloques</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    "heading",
                    "paragraph",
                    "image",
                    "vocab",
                    "example",
                    "video",
                    "list",
                    "callout",
                  ] as const
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addBlock(t)}
                    className="rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900"
                  >
                    + {t}
                  </button>
                ))}
              </div>
              {blocks.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800">
                  Sin bloques — añade Heading, Paragraph, Video, etc. Usa &quot;Ver cómo queda&quot;
                  para preview.
                </p>
              ) : (
                <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
                  {blocks.map((b, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] uppercase dark:bg-slate-800">
                          {b.type}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, -1)}
                            disabled={idx === 0}
                            className="rounded-lg border px-2 py-1 text-[11px] disabled:opacity-40 dark:border-slate-700"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, 1)}
                            disabled={idx === blocks.length - 1}
                            className="rounded-lg border px-2 py-1 text-[11px] disabled:opacity-40 dark:border-slate-700"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBlock(idx)}
                            className="rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-600 dark:bg-red-950/30"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      {b.type === "heading" ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={(b as Extract<LessonContentBlock, { type: "heading" }>).text}
                            onChange={(e) => updateBlock(idx, { text: e.target.value })}
                            placeholder="Heading text"
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <select
                            value={
                              (b as Extract<LessonContentBlock, { type: "heading" }>).level ?? 2
                            }
                            onChange={(e) =>
                              updateBlock(idx, { level: parseInt(e.target.value, 10) as 2 | 3 })
                            }
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          >
                            <option value={2}>H2</option>
                            <option value={3}>H3</option>
                          </select>
                        </div>
                      ) : null}
                      {b.type === "paragraph" ? (
                        <textarea
                          value={(b as Extract<LessonContentBlock, { type: "paragraph" }>).text}
                          onChange={(e) => updateBlock(idx, { text: e.target.value })}
                          rows={2}
                          placeholder="Paragraph"
                          className="w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                      ) : null}
                      {b.type === "image" ? (
                        <div className="grid gap-2">
                          <input
                            value={(b as Extract<LessonContentBlock, { type: "image" }>).url}
                            onChange={(e) => updateBlock(idx, { url: e.target.value })}
                            placeholder="Image URL"
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              value={(b as Extract<LessonContentBlock, { type: "image" }>).alt}
                              onChange={(e) => updateBlock(idx, { alt: e.target.value })}
                              placeholder="Alt text"
                              className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                            />
                            <input
                              value={
                                (b as Extract<LessonContentBlock, { type: "image" }>).caption ?? ""
                              }
                              onChange={(e) => updateBlock(idx, { caption: e.target.value })}
                              placeholder="Caption (optional)"
                              className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                            />
                          </div>
                          <div className="overflow-hidden rounded-xl border dark:border-slate-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={(b as Extract<LessonContentBlock, { type: "image" }>).url}
                              alt="preview"
                              className="max-h-40 w-full object-cover"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          </div>
                        </div>
                      ) : null}
                      {b.type === "vocab" ? (
                        <div className="space-y-2">
                          {((b as Extract<LessonContentBlock, { type: "vocab" }>).items ?? []).map(
                            (item, itemIdx) => (
                              <div
                                key={itemIdx}
                                className="grid gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_1fr_auto] dark:border-slate-700"
                              >
                                <input
                                  value={item.word}
                                  onChange={(e) => {
                                    const items = [
                                      ...((b as Extract<LessonContentBlock, { type: "vocab" }>)
                                        .items ?? []),
                                    ];
                                    items[itemIdx] = { ...items[itemIdx]!, word: e.target.value };
                                    updateBlock(idx, { items });
                                  }}
                                  placeholder="Word"
                                  className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                                />
                                <input
                                  value={item.definition}
                                  onChange={(e) => {
                                    const items = [
                                      ...((b as Extract<LessonContentBlock, { type: "vocab" }>)
                                        .items ?? []),
                                    ];
                                    items[itemIdx] = {
                                      ...items[itemIdx]!,
                                      definition: e.target.value,
                                    };
                                    updateBlock(idx, { items });
                                  }}
                                  placeholder="Definition"
                                  className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const items = (
                                      (b as Extract<LessonContentBlock, { type: "vocab" }>).items ??
                                      []
                                    ).filter((_, i) => i !== itemIdx);
                                    updateBlock(idx, { items });
                                  }}
                                  className="rounded-xl border px-2 py-1 text-xs dark:border-slate-700"
                                >
                                  x
                                </button>
                                <input
                                  value={item.example ?? ""}
                                  onChange={(e) => {
                                    const items = [
                                      ...((b as Extract<LessonContentBlock, { type: "vocab" }>)
                                        .items ?? []),
                                    ];
                                    items[itemIdx] = {
                                      ...items[itemIdx]!,
                                      example: e.target.value,
                                    };
                                    updateBlock(idx, { items });
                                  }}
                                  placeholder="Example (optional)"
                                  className="rounded-xl border px-2 py-1 text-sm sm:col-span-3 dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                            ),
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const cur =
                                (b as Extract<LessonContentBlock, { type: "vocab" }>).items ?? [];
                              updateBlock(idx, {
                                items: [...cur, { word: "new", definition: "definition" }],
                              });
                            }}
                            className="rounded-xl bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                          >
                            + Add word
                          </button>
                        </div>
                      ) : null}
                      {b.type === "example" ? (
                        <div className="grid gap-2">
                          <input
                            value={
                              (b as Extract<LessonContentBlock, { type: "example" }>).title ?? ""
                            }
                            onChange={(e) => updateBlock(idx, { title: e.target.value })}
                            placeholder="Title (optional)"
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <textarea
                            value={(b as Extract<LessonContentBlock, { type: "example" }>).text}
                            onChange={(e) => updateBlock(idx, { text: e.target.value })}
                            rows={2}
                            placeholder="Example text"
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <input
                            value={
                              (b as Extract<LessonContentBlock, { type: "example" }>).translation ??
                              ""
                            }
                            onChange={(e) => updateBlock(idx, { translation: e.target.value })}
                            placeholder="Translation (optional)"
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                      ) : null}
                      {b.type === "video" ? (
                        <div className="grid gap-2">
                          <input
                            value={(b as Extract<LessonContentBlock, { type: "video" }>).url}
                            onChange={(e) => updateBlock(idx, { url: e.target.value })}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <input
                            value={
                              (b as Extract<LessonContentBlock, { type: "video" }>).caption ?? ""
                            }
                            onChange={(e) => updateBlock(idx, { caption: e.target.value })}
                            placeholder="Caption (optional)"
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          {youtubeEmbedPreview(
                            (b as Extract<LessonContentBlock, { type: "video" }>).url,
                          ) ? (
                            <div className="overflow-hidden rounded-xl border bg-black dark:border-slate-700">
                              <div className="relative aspect-video">
                                <iframe
                                  src={youtubeEmbedPreview(
                                    (b as Extract<LessonContentBlock, { type: "video" }>).url,
                                  )!}
                                  title="block video preview"
                                  className="absolute inset-0 h-full w-full"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-amber-600">
                              URL no válida — usa YouTube/Vimeo.
                            </p>
                          )}
                        </div>
                      ) : null}
                      {b.type === "list" ? (
                        <div className="space-y-2">
                          <textarea
                            value={(
                              (b as Extract<LessonContentBlock, { type: "list" }>).items ?? []
                            ).join("\n")}
                            onChange={(e) =>
                              updateBlock(idx, {
                                items: e.target.value.split("\n").filter(Boolean),
                              })
                            }
                            rows={3}
                            placeholder="One item per line"
                            className="w-full rounded-xl border px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={Boolean(
                                (b as Extract<LessonContentBlock, { type: "list" }>).ordered,
                              )}
                              onChange={(e) => updateBlock(idx, { ordered: e.target.checked })}
                            />{" "}
                            Ordered
                          </label>
                        </div>
                      ) : null}
                      {b.type === "callout" ? (
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            value={(b as Extract<LessonContentBlock, { type: "callout" }>).text}
                            onChange={(e) => updateBlock(idx, { text: e.target.value })}
                            placeholder="Callout text"
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <select
                            value={
                              (b as Extract<LessonContentBlock, { type: "callout" }>).variant ??
                              "info"
                            }
                            onChange={(e) => updateBlock(idx, { variant: e.target.value as never })}
                            className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          >
                            <option value="info">info</option>
                            <option value="tip">tip</option>
                            <option value="warning">warning</option>
                          </select>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
              >
                ← Volver
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                >
                  👁️ Ver cómo queda
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
                >
                  Siguiente → Preview
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Step 3 */}
        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                Paso 3 — Preview y guardar
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Revisa cómo lo verá el estudiante. Si todo se ve bien, guarda. Puedes volver a
                editar sin perder nada.
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Live preview — vista estudiante</h3>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="rounded-xl bg-white px-3 py-1 text-xs font-medium shadow-sm dark:bg-slate-900"
                >
                  Abrir en modal ↗
                </button>
              </div>
              <div className="mt-3 rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <TeachingContent
                  content={previewContent as never}
                  bodyMarkdown={bodyMarkdown}
                  coverImage={coverImage || null}
                  title={title || "Preview title"}
                />
                {videoUrl &&
                !blocks.some(
                  (b) =>
                    b.type === "video" &&
                    (b as Extract<LessonContentBlock, { type: "video" }>).url === videoUrl,
                ) &&
                youtubeEmbedPreview(videoUrl) ? (
                  <div className="mt-4 overflow-hidden rounded-xl border bg-black dark:border-slate-700">
                    <div className="relative aspect-video">
                      <iframe
                        src={youtubeEmbedPreview(videoUrl)!}
                        title="top video"
                        className="absolute inset-0 h-full w-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="rounded-full border bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                  Título: {title || "—"}
                </span>
                <span className="rounded-full border bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                  Kind: {kind}
                </span>
                <span className="rounded-full border bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                  {blocks.length} bloques
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
              >
                ← Editar contenido
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500" aria-live="polite">
                  {msg}
                </span>
                <button
                  onClick={handleSave}
                  disabled={loading || !step1Valid}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear lección"}
                </button>
              </div>
            </div>
            {!step1Valid ? (
              <p className="text-xs text-red-600">
                Completa el Paso 1 (hay errores marcados en rojo) antes de guardar.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Modal preview */}
      {showPreviewModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-semibold">Preview — cómo lo ve el estudiante</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-full border px-3 py-1 text-xs dark:border-slate-700"
              >
                ✕ Cerrar
              </button>
            </div>
            <div className="p-4">
              <TeachingContent
                content={previewContent as never}
                bodyMarkdown={bodyMarkdown}
                coverImage={coverImage || null}
                title={title || "Preview title"}
              />
              {videoUrl &&
              youtubeEmbedPreview(videoUrl) &&
              !blocks.some(
                (b) =>
                  b.type === "video" &&
                  (b as Extract<LessonContentBlock, { type: "video" }>).url === videoUrl,
              ) ? (
                <div className="mt-4 overflow-hidden rounded-xl border bg-black">
                  <div className="relative aspect-video">
                    <iframe
                      src={youtubeEmbedPreview(videoUrl)!}
                      title="video"
                      className="absolute inset-0 h-full w-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
