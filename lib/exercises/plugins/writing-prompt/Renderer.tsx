"use client";
import { useState } from "react";
import type { WritingPrompt, WritingAnswer } from "./schema";
export function WritingPromptRenderer({ prompt, onSubmit }: { prompt: WritingPrompt; onSubmit: (a: WritingAnswer) => void }) {
  const [text, setText] = useState("");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-y-3">
      <p className="font-medium">{prompt.prompt}</p>
      <p className="text-xs text-gray-500">{prompt.minWords}–{prompt.maxWords} words suggested</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Write your answer..." className="w-full rounded border px-3 py-2 text-sm" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{words} words</span>
        <button onClick={() => onSubmit({ text })} className="rounded bg-primary px-4 py-2 text-white">Submit for correction</button>
      </div>
    </div>
  );
}
