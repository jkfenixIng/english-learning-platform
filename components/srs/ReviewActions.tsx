"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

type CardState = {
  interval: number;
  easeFactor: number;
  repetitions: number;
};

const QUALITY_META: Record<number, { labelKey: string; color: string; ring: string; bg: string }> =
  {
    0: {
      labelKey: "quality0Label",
      color: "text-white",
      bg: "bg-red-600 hover:bg-red-700",
      ring: "ring-red-200",
    },
    1: {
      labelKey: "quality1Label",
      color: "text-white",
      bg: "bg-orange-600 hover:bg-orange-700",
      ring: "ring-orange-200",
    },
    2: {
      labelKey: "quality2Label",
      color: "text-white",
      bg: "bg-amber-600 hover:bg-amber-700",
      ring: "ring-amber-200",
    },
    3: {
      labelKey: "quality3Label",
      color: "text-white",
      bg: "bg-lime-600 hover:bg-lime-700",
      ring: "ring-lime-200",
    },
    4: {
      labelKey: "quality4Label",
      color: "text-white",
      bg: "bg-emerald-600 hover:bg-emerald-700",
      ring: "ring-emerald-200",
    },
    5: {
      labelKey: "quality5Label",
      color: "text-white",
      bg: "bg-indigo-600 hover:bg-indigo-700",
      ring: "ring-indigo-200",
    },
  };

function previewNext(card: CardState, quality: number): { days: number; easeDelta: string } {
  let interval = card.interval;
  let repetitions = card.repetitions;
  let ease = card.easeFactor;
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease);
  } else {
    interval = 1;
  }
  const newEase = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const delta = newEase - ease;
  const easeDelta = `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;
  return { days: interval, easeDelta };
}

export function ReviewActions({
  cardId,
  cardState,
  locale: _locale,
}: {
  cardId: string;
  cardState: CardState;
  locale: string;
}) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [pendingQ, setPendingQ] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [doneQ, setDoneQ] = useState<number | null>(null);

  async function handleQuality(q: number) {
    setError(null);
    setPendingQ(q);
    try {
      const res = await fetch("/api/srs/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, quality: q }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      setDoneQ(q);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setPendingQ(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((q) => {
          const meta = QUALITY_META[q]!;
          const label = t(meta.labelKey as never);
          const preview = previewNext(cardState, q);
          const isActive = pendingQ === q && isPending;
          const isDone = doneQ === q;
          return (
            <button
              key={q}
              type="button"
              onClick={() => handleQuality(q)}
              disabled={isPending}
              title={`${label} → ${t("nextIn", { days: preview.days } as never)} · ease ${preview.easeDelta} ${isDone ? "✓" : ""}`}
              aria-label={`${label} (Q${q}) — ${t("nextIn", { days: preview.days } as never)}`}
              className={`inline-flex min-w-[84px] flex-col items-center rounded-lg border px-2.5 py-2 text-xs font-medium shadow-sm transition focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 ${meta.bg} ${meta.color} ${meta.ring} ${isDone ? "ring-2" : ""}`}
            >
              <span className="flex items-center gap-1">
                <span className="font-bold">Q{q}</span>
                <span className="text-[11px] opacity-90">{label}</span>
              </span>
              <span className="mt-0.5 text-[10px] font-normal opacity-90">
                {isActive ? t("creatingDemo") : t("nextIn", { days: preview.days } as never)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("qualityHint")}</p>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {doneQ !== null && !error && (
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
          Q{doneQ} {t(QUALITY_META[doneQ]!.labelKey as never)} ✓
        </p>
      )}
    </div>
  );
}

export default ReviewActions;
