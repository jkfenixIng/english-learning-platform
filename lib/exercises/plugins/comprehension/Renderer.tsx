"use client";
import { useState } from "react";
import type { ComprehensionPrompt, ComprehensionAnswer } from "./schema";
export function ComprehensionRenderer({ prompt, onSubmit }: { prompt: ComprehensionPrompt; onSubmit: (a: ComprehensionAnswer) => void }) {
  const [answer, setAnswer] = useState("");
  return (
    <div className="space-y-4">
      <div className="rounded bg-gray-50 p-4 text-sm leading-relaxed">{prompt.passage}</div>
      <p className="font-medium">{prompt.question}</p>
      <div className="space-y-2">
        {prompt.options.map((o) => (
          <label key={o} className={`flex cursor-pointer items-center gap-2 rounded border p-2 ${answer === o ? "border-indigo-500 bg-indigo-50" : "bg-white"}`}>
            <input type="radio" name="comp" value={o} checked={answer === o} onChange={() => setAnswer(o)} />{o}
          </label>
        ))}
      </div>
      <button onClick={() => onSubmit({ answer })} className="rounded bg-primary px-4 py-2 text-white">Submit</button>
    </div>
  );
}
