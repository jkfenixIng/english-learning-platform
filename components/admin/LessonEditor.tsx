"use client";

import { useEffect, useState } from "react";
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

export function LessonEditor({ lessonId, onSaved, onCancel }: Props) {
  const isEdit = Boolean(lessonId);
  const [levels, setLevels] = useState<LevelOpt[]>([]);
  const [units, setUnits] = useState<UnitOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
        // set levelFilter from unit
        if (data.unit?.level?.code) {
          // not needed, but we can set levelFilter to levelId if available
        }
      } catch (e) {
        if (!cancelled) setMsg("Error loading lesson: " + String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  // Derive filtered units
  const filteredUnits = levelFilter ? units.filter((u) => u.levelId === levelFilter) : units;
  // Auto-select levelFilter when unitId changes
  useEffect(() => {
    if (!unitId) return;
    const u = units.find((x) => x.id === unitId);
    if (u && levelFilter !== u.levelId) {
      // only auto set if not already set or empty
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
    setMsg("Guardando...");
    setLoading(true);
    try {
      // compose final blocks: merge top Video URL into blocks if provided and not already present as video
      let finalBlocks = [...blocks];
      const trimmedVideo = videoUrl.trim();
      if (trimmedVideo) {
        const hasVideoWithUrl = finalBlocks.some(
          (b) =>
            b.type === "video" &&
            (b as Extract<LessonContentBlock, { type: "video" }>).url === trimmedVideo,
        );
        if (!hasVideoWithUrl) {
          // if there's a video block, update first video block url; otherwise prepend
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

      // client-side quick validation
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
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isEdit ? "Editar lección" : "Crear lección"} (sin tecnicismo)
        </h2>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-200 px-3 py-1 text-xs dark:border-slate-700"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      {/* Row 1: Level filter + Unit */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium">
          Level (filtro)
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
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
          Unit * <span className="font-normal text-slate-500">requerido</span>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            required
          >
            <option value="">Selecciona Unit</option>
            {filteredUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title} {u.level?.code ? `(${u.level.code})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium sm:col-span-2">
          Title *
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson 1: Greetings"
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="text-xs font-medium sm:col-span-2">
          Objectives *
          <textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            placeholder="Objectives for A1 U1 L1 — greet and introduce"
            rows={2}
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="text-xs font-medium">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as never)}
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium">
            Order
            <input
              type="number"
              value={orderIndex}
              onChange={(e) => setOrderIndex(parseInt(e.target.value || "1", 10))}
              min={1}
              max={99}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="text-xs font-medium">
            Minutes
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value || "10", 10))}
              min={1}
              max={180}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>
      </div>

      {/* Cover */}
      <fieldset className="rounded border border-slate-200 p-3 dark:border-slate-700">
        <legend className="px-1 text-xs font-semibold">Cover image</legend>
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div>
            <input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://... or /lesson-images/teaching-placeholder.png"
              className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              URL http(s) o ruta local /lesson-images/... — preview a la derecha.
            </p>
            <button
              type="button"
              disabled
              className="mt-2 rounded bg-slate-100 px-3 py-1 text-[11px] text-slate-500 dark:bg-slate-800"
              title="Upload placeholder — usa URL por ahora"
            >
              Upload (próximamente — usa URL)
            </button>
          </div>
          <div className="overflow-hidden rounded border bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
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
                Sin imagen — se mostrará placeholder en lección.
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* Video URL */}
      <fieldset className="rounded border border-slate-200 p-3 dark:border-slate-700">
        <legend className="px-1 text-xs font-semibold">Video (YouTube / Vimeo — cero costo)</legend>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Pega URL de YouTube o Vimeo — se convierte a embed. También puedes añadir bloques Video
          dentro del contenido abajo.
        </p>
        {embedPreview ? (
          <div className="mt-3 overflow-hidden rounded border bg-black dark:border-slate-700">
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
        ) : videoUrl.trim() ? (
          <p className="mt-2 text-xs text-amber-600">
            URL no reconocida — prueba con youtube.com/watch?v=... o youtu.be/...
          </p>
        ) : null}
      </fieldset>

      {/* Body markdown */}
      <label className="block text-xs font-medium">
        Body Markdown (fallback opcional)
        <textarea
          value={bodyMarkdown}
          onChange={(e) => setBodyMarkdown(e.target.value)}
          rows={4}
          placeholder="Texto en markdown — se muestra bajo los bloques. Puedes dejarlo vacío si usas bloques."
          className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
        />
        {bodyMarkdown ? (
          <div className="prose prose-sm dark:prose-invert mt-2 max-w-none rounded border bg-slate-50 p-3 dark:bg-slate-800">
            {bodyMarkdown.split("\n\n").map((p, i) => (
              <p key={i} className="text-sm text-slate-700 dark:text-slate-300">
                {p}
              </p>
            ))}
          </div>
        ) : null}
      </label>

      {/* Content blocks visual editor */}
      <div className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Contenido — bloques visuales (no JSON)</h3>
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
              className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900"
            >
              + {t}
            </button>
          ))}
        </div>

        {blocks.length === 0 ? (
          <p className="rounded bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800">
            Sin bloques — añade Heading, Paragraph, Video, etc. La preview abajo reflejará el
            contenido real de la lección.
          </p>
        ) : (
          <div className="space-y-3">
            {blocks.map((b, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] uppercase dark:bg-slate-800">
                    {b.type}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(idx, -1)}
                      disabled={idx === 0}
                      className="rounded border px-2 py-1 text-[11px] disabled:opacity-40 dark:border-slate-700"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(idx, 1)}
                      disabled={idx === blocks.length - 1}
                      className="rounded border px-2 py-1 text-[11px] disabled:opacity-40 dark:border-slate-700"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(idx)}
                      className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100 dark:bg-red-950/30"
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
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <select
                      value={(b as Extract<LessonContentBlock, { type: "heading" }>).level ?? 2}
                      onChange={(e) =>
                        updateBlock(idx, { level: parseInt(e.target.value, 10) as 2 | 3 })
                      }
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                    className="w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                ) : null}
                {b.type === "image" ? (
                  <div className="grid gap-2">
                    <input
                      value={(b as Extract<LessonContentBlock, { type: "image" }>).url}
                      onChange={(e) => updateBlock(idx, { url: e.target.value })}
                      placeholder="Image URL"
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={(b as Extract<LessonContentBlock, { type: "image" }>).alt}
                        onChange={(e) => updateBlock(idx, { alt: e.target.value })}
                        placeholder="Alt text"
                        className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                      <input
                        value={(b as Extract<LessonContentBlock, { type: "image" }>).caption ?? ""}
                        onChange={(e) => updateBlock(idx, { caption: e.target.value })}
                        placeholder="Caption (optional)"
                        className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div className="overflow-hidden rounded border dark:border-slate-700">
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
                          className="grid gap-2 rounded border p-2 sm:grid-cols-[1fr_1fr_auto] dark:border-slate-700"
                        >
                          <input
                            value={item.word}
                            onChange={(e) => {
                              const items = [
                                ...((b as Extract<LessonContentBlock, { type: "vocab" }>).items ??
                                  []),
                              ];
                              items[itemIdx] = { ...items[itemIdx]!, word: e.target.value };
                              updateBlock(idx, { items });
                            }}
                            placeholder="Word"
                            className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <input
                            value={item.definition}
                            onChange={(e) => {
                              const items = [
                                ...((b as Extract<LessonContentBlock, { type: "vocab" }>).items ??
                                  []),
                              ];
                              items[itemIdx] = { ...items[itemIdx]!, definition: e.target.value };
                              updateBlock(idx, { items });
                            }}
                            placeholder="Definition"
                            className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const items = (
                                (b as Extract<LessonContentBlock, { type: "vocab" }>).items ?? []
                              ).filter((_, i) => i !== itemIdx);
                              updateBlock(idx, { items });
                            }}
                            className="rounded border px-2 py-1 text-xs dark:border-slate-700"
                          >
                            x
                          </button>
                          <input
                            value={item.example ?? ""}
                            onChange={(e) => {
                              const items = [
                                ...((b as Extract<LessonContentBlock, { type: "vocab" }>).items ??
                                  []),
                              ];
                              items[itemIdx] = { ...items[itemIdx]!, example: e.target.value };
                              updateBlock(idx, { items });
                            }}
                            placeholder="Example (optional)"
                            className="rounded border px-2 py-1 text-sm sm:col-span-3 dark:border-slate-700 dark:bg-slate-900"
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
                      className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                    >
                      + Add word
                    </button>
                  </div>
                ) : null}
                {b.type === "example" ? (
                  <div className="grid gap-2">
                    <input
                      value={(b as Extract<LessonContentBlock, { type: "example" }>).title ?? ""}
                      onChange={(e) => updateBlock(idx, { title: e.target.value })}
                      placeholder="Title (optional)"
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <textarea
                      value={(b as Extract<LessonContentBlock, { type: "example" }>).text}
                      onChange={(e) => updateBlock(idx, { text: e.target.value })}
                      rows={2}
                      placeholder="Example text"
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      value={
                        (b as Extract<LessonContentBlock, { type: "example" }>).translation ?? ""
                      }
                      onChange={(e) => updateBlock(idx, { translation: e.target.value })}
                      placeholder="Translation (optional)"
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                ) : null}
                {b.type === "video" ? (
                  <div className="grid gap-2">
                    <input
                      value={(b as Extract<LessonContentBlock, { type: "video" }>).url}
                      onChange={(e) => updateBlock(idx, { url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      value={(b as Extract<LessonContentBlock, { type: "video" }>).caption ?? ""}
                      onChange={(e) => updateBlock(idx, { caption: e.target.value })}
                      placeholder="Caption (optional)"
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    {youtubeEmbedPreview(
                      (b as Extract<LessonContentBlock, { type: "video" }>).url,
                    ) ? (
                      <div className="overflow-hidden rounded border bg-black dark:border-slate-700">
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
                        URL no válida para preview — usa YouTube/Vimeo.
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
                        updateBlock(idx, { items: e.target.value.split("\n").filter(Boolean) })
                      }
                      rows={3}
                      placeholder="One item per line"
                      className="w-full rounded border px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
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
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <select
                      value={
                        (b as Extract<LessonContentBlock, { type: "callout" }>).variant ?? "info"
                      }
                      onChange={(e) => updateBlock(idx, { variant: e.target.value as never })}
                      className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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

      {/* Live preview */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Live preview (como lo ve el estudiante)</h3>
        <div className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {/* Simulate preview using TeachingContent */}
          <TeachingContent
            content={previewContent as never}
            bodyMarkdown={bodyMarkdown}
            coverImage={coverImage || null}
            title={title || "Preview title"}
          />
          {/* Top video preview if not already in blocks */}
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
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear lección"}
        </button>
        <span className="self-center text-xs text-slate-500" aria-live="polite">
          {msg}
        </span>
      </div>
    </div>
  );
}
