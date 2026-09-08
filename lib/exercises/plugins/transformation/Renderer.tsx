"use client";
import { useState } from "react";
import type { TransformationPrompt, TransformationAnswer } from "./schema";
export function TransformationRenderer({ prompt, onSubmit }: { prompt: TransformationPrompt; onSubmit: (a: TransformationAnswer) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{prompt.instruction}</p>
      <p className="rounded bg-gray-50 p-3 italic">{prompt.sentence}</p>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Your answer" className="w-full rounded border px-3 py-2" />
      <button onClick={() => onSubmit({ text })} className="rounded bg-indigo-600 px-4 py-2 text-white">Submit</button>
    </div>
  );
}
