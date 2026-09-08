"use client";
import { useState } from "react";
import type { GradedReadingPrompt, GradedReadingAnswer } from "./schema";
export function GradedReadingRenderer({ prompt, onSubmit }: { prompt: GradedReadingPrompt; onSubmit: (a: GradedReadingAnswer) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{prompt.title}</h3>
      <div className="rounded bg-gray-50 p-4 text-sm leading-relaxed">{prompt.passage}</div>
      {prompt.vocab?.length ? (
        <div className="flex flex-wrap gap-2">
          {prompt.vocab.map((v) => (
            <span key={v.word} className="rounded bg-amber-100 px-2 py-1 text-xs" title={v.definition}><strong>{v.word}</strong>: {v.definition}</span>
          ))}
        </div>
      ) : null}
      <div className="space-y-3">
        {prompt.questions.map((q) => (
          <div key={q.id} className="rounded border p-3">
            <p className="mb-2 text-sm font-medium">{q.question}</p>
            <div className="space-y-1">
              {q.options.map((o) => (
                <label key={o} className="flex gap-2 text-sm"><input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => setAnswers((p) => ({ ...p, [q.id]: o }))} />{o}</label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onSubmit({ answers })} className="rounded bg-primary px-4 py-2 text-white">Submit</button>
    </div>
  );
}
