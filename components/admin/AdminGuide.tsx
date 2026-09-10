"use client";

import { useState } from "react";

type TabId = "crear" | "contenido" | "editar";

const TABS: { id: TabId; label: string; icon: string; desc: string }[] = [
  { id: "crear", label: "Crear lección", icon: "📚", desc: "Paso 1 → 2 → 3 en 2 min" },
  {
    id: "contenido",
    label: "Añadir prueba / video",
    icon: "🎬",
    desc: "Videos y ejercicios sin código",
  },
  {
    id: "editar",
    label: "Editar / Eliminar / Duplicar",
    icon: "✏️",
    desc: "Control total sin miedo",
  },
];

export function AdminGuide({ collapsible = true }: { collapsible?: boolean }) {
  const [active, setActive] = useState<TabId>("crear");
  const [open, setOpen] = useState(true);

  return (
    <section
      className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30"
      aria-label="Guía del panel de administración"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm text-white">
            ?
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Guía rápida — sin tecnicismos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aprende a gestionar lecciones y pruebas en 3 pasos. Todo es visual, sin JSON.
            </p>
          </div>
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border bg-white px-3 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            aria-expanded={open}
          >
            {open ? "Ocultar" : "Mostrar guía"}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-indigo-100 bg-white/60 px-2 py-3 backdrop-blur sm:px-4 dark:border-slate-800 dark:bg-slate-900/40">
          {/* Tabs */}
          <div
            role="tablist"
            className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                onClick={() => setActive(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition sm:text-sm ${
                  active === t.id
                    ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-200"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                <span aria-hidden>{t.icon}</span>
                {t.label}
                <span className="hidden text-[11px] font-normal opacity-70 sm:inline">
                  — {t.desc}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            {active === "crear" ? <CrearTab /> : null}
            {active === "contenido" ? <ContenidoTab /> : null}
            {active === "editar" ? <EditarTab /> : null}
          </div>

          <details className="group mt-3 rounded-xl border bg-amber-50/60 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-950/20">
            <summary className="cursor-pointer list-none text-xs font-semibold text-amber-900 dark:text-amber-100">
              <span className="inline-flex items-center gap-2">
                <span className="transition group-open:rotate-90">▶</span> Video placeholder — cómo
                usar el panel (30s)
                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] dark:bg-amber-900">
                  próximamente
                </span>
              </span>
            </summary>
            <div className="mt-3 overflow-hidden rounded-xl border bg-black dark:border-slate-700">
              <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900 p-6 text-center">
                <div>
                  <p className="text-sm font-semibold text-white">🎥 Tutorial en video</p>
                  <p className="mt-1 text-xs text-white/70">
                    Aquí irá un video corto (YouTube embebido) que muestra los 3 pasos. Mientras,
                    usa los tabs de arriba.
                  </p>
                  <p className="mt-3 text-[11px] text-white/50">
                    Pega tu URL de YouTube en el editor — se ve como iframe automático.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-200">
              Consejo: usa{" "}
              <code className="rounded bg-white px-1 dark:bg-slate-800">
                Crear lección → Contenido → Preview
              </code>{" "}
              para publicar sin errores.
            </p>
          </details>
        </div>
      ) : null}
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        <div className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {children}
        </div>
      </div>
    </div>
  );
}

function CrearTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Crea una lección completa sin tocar código. El asistente te guía.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Step n={1} title="Información básica">
          Ve a <strong>Lecciones → Crear lección</strong>. Elige <em>Level</em> (filtro) +{" "}
          <em>Unit</em> requerido, escribe{" "}
          <span
            title="Se muestra en la tarjeta de la lección y en el listado"
            className="cursor-help underline decoration-dotted"
          >
            Título
          </span>{" "}
          y{" "}
          <span
            title="Objetivos visibles para el estudiante"
            className="cursor-help underline decoration-dotted"
          >
            Objectives
          </span>
          . Elige <em>Kind</em> (Teach/Practice/Quiz/Exam) y orden.
          <span className="mt-1 block rounded bg-slate-50 px-2 py-1 font-mono text-[11px] dark:bg-slate-800">
            Ejemplo: &quot;Lesson 1: Greetings&quot; — Objectives: &quot;Saludar y presentarse&quot;
          </span>
        </Step>
        <Step n={2} title="Contenido visual">
          Añade bloques: <code>Heading</code>, <code>Paragraph</code>, <code>Video</code>,{" "}
          <code>Vocab</code>, <code>Image</code>. Pega URL de YouTube — se convierte a embed
          automáticamente. Ve el preview en vivo.
        </Step>
        <Step n={3} title="Preview y guardar">
          Pulsa <strong>Ver cómo queda</strong> para ver la lección como estudiante. Revisa y pulsa{" "}
          <strong>Crear lección</strong>. ¡Listo! Aparece en el listado y en la app.
        </Step>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
        💡 <strong>Ayuda contextual:</strong> pasa el cursor sobre los títulos subrayados para ver
        para qué sirve cada campo. Si falta Unit o Título, el botón te avisa antes de guardar.
      </div>
    </div>
  );
}

function ContenidoTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Step n={1} title="Añadir video (cero costo)">
          En el editor, pega tu URL de YouTube/Vimeo en el campo <em>Video</em>. Ejemplo:{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
            https://youtube.com/watch?v=...
          </code>
          . Verás el iframe al instante. También puedes añadir bloques <em>Video</em> dentro del
          contenido.
        </Step>
        <Step n={2} title="Añadir prueba / ejercicio">
          Ve a <strong>Exercises → Crear ejercicio</strong>. Elige tipo (fill_blanks, flashcard,
          etc.), selecciona lección con búsqueda (no escribas IDs a mano), ajusta dificultad 1-5 y
          completa el formulario visual por tipo. Imágenes con preview local.
        </Step>
      </div>
      <div className="rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-xs font-semibold">Tipos de ejercicio (13) — sin JSON:</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          fill_blanks (huecos ___), ordering (ordena palabras), flashcard, matching, listening_tts,
          dictation, comprensión, graded_reading, writing_prompt, speaking_record, etc. Cada tipo
          muestra su formulario específico. El JSON se genera solo.
        </p>
      </div>
      <p className="text-[11px] text-slate-500">
        Tip: usa <strong>Preview JSON</strong> en el editor para ver lo que verá el estudiante, y{" "}
        <strong>Preview real</strong> para probar el ejercicio.
      </p>
    </div>
  );
}

function EditarTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Step n={1} title="Editar ✏️">
          En la tabla, pulsa <strong>Editar</strong> (✏️). Se abre el mismo editor con datos
          cargados. Cambia lo que necesites y <strong>Guardar cambios</strong>. Validación inline te
          avisa si falta algo.
        </Step>
        <Step n={2} title="Duplicar 📋">
          Pulsa <strong>Duplicar</strong> (📋) para crear una copia con título &quot;(copia)&quot;.
          Útil para crear variantes rápidas sin empezar de cero.
        </Step>
        <Step n={3} title="Eliminar 🗑️ con seguridad">
          Pulsa <strong>Eliminar</strong> (🗑️). Aparece un diálogo de confirmación — no se borra sin
          tu OK. La acción no se puede deshacer, por eso pedimos confirmación.
        </Step>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span
          title="Pasa el cursor sobre una fila para ver preview de imagen y detalles"
          className="cursor-help rounded-full border bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-800"
        >
          👁️ Hover en filas = preview
        </span>
        <span
          title="Filtra por título, level, kind o tipo sin recargar la página"
          className="cursor-help rounded-full border bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-800"
        >
          🔍 Búsqueda y filtros instantáneos
        </span>
        <span
          title="Cambia el orden sin tocar la base de datos"
          className="cursor-help rounded-full border bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-800"
        >
          ↕️ Ordenar por columna
        </span>
      </div>
    </div>
  );
}
