"use client";
import { diffWords } from "../../lib/speech/scoring";

export function TranscriptDiff({ reference, transcript }: { reference: string; transcript: string }) {
  const diff = diffWords(reference, transcript);
  if (!transcript) return <p className="text-sm text-gray-500" aria-live="polite">No transcript yet — record to see diff.</p>;
  return (
    <div className="rounded border p-3 dark:border-gray-700" aria-label="Transcript diff">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Reference vs you</p>
      <p className="flex flex-wrap gap-1.5" aria-live="polite">
        {diff.map((d, i) => (
          <span
            key={`${d.word}-${i}`}
            className={
              d.status === "match"
                ? "rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                : d.status === "miss"
                  ? "rounded bg-red-100 px-1.5 py-0.5 text-red-800 line-through dark:bg-red-900/40 dark:text-red-200"
                  : "rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
            }
            title={d.status}
          >
            {d.word}
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs text-gray-500">Green = matched, red = missed, amber = extra word.</p>
    </div>
  );
}
