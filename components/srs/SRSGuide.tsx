"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

const QUALITY = [
  { q: 0, color: "bg-red-500", labelKey: "quality0Label" as const },
  { q: 1, color: "bg-orange-500", labelKey: "quality1Label" as const },
  { q: 2, color: "bg-amber-500", labelKey: "quality2Label" as const },
  { q: 3, color: "bg-lime-500", labelKey: "quality3Label" as const },
  { q: 4, color: "bg-emerald-500", labelKey: "quality4Label" as const },
  { q: 5, color: "bg-indigo-500", labelKey: "quality5Label" as const },
];

function previewInterval(repetitions: number, interval: number, ease: number, q: number): number {
  if (q >= 3) {
    if (repetitions === 0) return 1;
    if (repetitions === 1) return 6;
    return Math.round(interval * ease);
  }
  return 1;
}

export function SRSGuide({ locale, demoEase = 2.5 }: { locale: string; demoEase?: number }) {
  const t = useTranslations("reviews");

  // visual bar heights mimic ease/interval growth
  const exampleSteps = [
    { label: "1d", h: 8 },
    { label: "6d", h: 20 },
    { label: "15d", h: 36 },
  ];

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/30">
      <h2 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
        {t("howItWorksTitle")}
      </h2>

      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {/* What */}
        <div className="rounded-lg border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {t("howItWorksWhat")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {t("howItWorksWhatDesc")}
          </p>
          <div className="mt-3 flex items-end gap-1.5">
            {exampleSteps.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 rounded bg-indigo-500 dark:bg-indigo-400"
                  style={{ height: `${s.h}px` }}
                  aria-hidden
                />
                <span className="text-[10px] text-slate-500">{s.label}</span>
              </div>
            ))}
            <span className="mb-1 ml-2 text-[10px] text-slate-500">SM-2</span>
          </div>
        </div>

        {/* How created */}
        <div className="rounded-lg border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {t("howCreated")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {t("howCreatedDesc")}
          </p>
          <div className="mt-3 rounded bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="font-medium">flashcard</span> /{" "}
            <span className="font-medium">matching</span> → auto
            <br />
            score &lt; 70 → auto
            <br />
            <span className="text-slate-500 dark:text-slate-400">
              interval 0 · ease 2.5 · due today
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {t("intervalsExample")}
          </p>
        </div>

        {/* How rated */}
        <div className="rounded-lg border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("howRated")}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {t("howRatedDesc")}
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="flex gap-1">
              {QUALITY.map((qc) => (
                <div key={qc.q} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`h-2 w-full rounded ${qc.color}`} aria-hidden />
                  <span className="text-[9px] font-medium text-slate-700 dark:text-slate-300">
                    Q{qc.q}
                  </span>
                  <span className="text-center text-[9px] leading-none text-slate-500 dark:text-slate-400">
                    {t(qc.labelKey)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>← {t("quality0Label")}</span>
              <span>{t("quality5Label")} →</span>
            </div>
            {/* next interval preview row for demo card (reps 0 interval 0 ease 2.5) */}
            <div className="flex flex-wrap gap-1 pt-1">
              {QUALITY.map((qc) => {
                const days = previewInterval(0, 0, demoEase, qc.q);
                return (
                  <span
                    key={qc.q}
                    title={`${t(qc.labelKey)} → ${days}d`}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Q{qc.q}→{days}d
                  </span>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{t("howWhenDesc")}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-indigo-700 dark:text-indigo-300">{t("example")}</p>

      <div className="mt-2 text-xs">
        <Link
          href={`/${locale}/settings`}
          className="text-indigo-600 underline dark:text-indigo-400"
        >
          {t("goToSettings")}
        </Link>
        <span className="mx-1 text-slate-400">·</span>
        <span className="text-slate-500 dark:text-slate-400">{t("manualHint")}</span>
      </div>
    </div>
  );
}

export default SRSGuide;
