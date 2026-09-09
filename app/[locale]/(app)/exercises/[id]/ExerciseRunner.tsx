"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import "../../../../../lib/exercises/init";

import { getPlugin } from "../../../../../lib/exercises/registry";
import type { ExerciseType } from "../../../../../lib/exercises/types";

interface Props {
  exercise: { id: string; type: string; prompt: unknown; solution: unknown };
}

export default function ExerciseRunner({ exercise }: Props) {
  const t = useTranslations("exercise");
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const plugin = getPlugin(exercise.type as ExerciseType);

  if (!plugin)
    return <p className="text-sm text-red-600">{t("unknownType", { type: exercise.type })}</p>;

  const Renderer = plugin.Renderer as React.ComponentType<{
    prompt: unknown;
    onSubmit: (a: unknown) => void;
  }>;

  const handleSubmit = async (answer: unknown) => {
    setLoading(true);
    try {
      // client-side evaluate for instant feedback
      const evalResult = plugin.evaluate(
        exercise.prompt as never,
        exercise.solution,
        answer as never,
      );
      setResult(evalResult);
      // persist attempt
      await fetch(`/api/exercises/${exercise.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, timeSpentMs: 5000 }),
      });
    } catch (e) {
      setResult({ score: 0, feedback: String(e) });
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <Renderer prompt={exercise.prompt as never} onSubmit={handleSubmit} />
      {loading ? <p className="mt-3 text-sm text-gray-500">{t("evaluating")}</p> : null}
      {result ? (
        <div
          className={`mt-4 rounded border p-3 text-sm ${result.score >= 70 ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}
        >
          <p className="font-semibold">{t("scoreLabel", { score: result.score })}</p>
          <p>{result.feedback}</p>
        </div>
      ) : null}
    </div>
  );
}
