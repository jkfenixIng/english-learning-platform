"use client";
import { useState } from "react";
import type { MatchingPrompt, MatchingAnswer } from "./schema";
export function MatchingRenderer({ prompt, onSubmit }: { prompt: MatchingPrompt; onSubmit: (a: MatchingAnswer) => void }) {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const rights = prompt.pairs.map((p) => p.right);
  const handleLeft = (l: string) => setLeftSel(l);
  const handleRight = (r: string) => { if (leftSel) { setMatches((m) => ({ ...m, [leftSel]: r })); setLeftSel(null); } };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {prompt.pairs.map((p) => (
            <button key={p.id} onClick={() => handleLeft(p.left)} className={`w-full rounded border p-2 text-left text-sm ${leftSel === p.left ? "bg-indigo-100 border-indigo-400" : "bg-white"} ${matches[p.left] ? "opacity-60" : ""}`}>{p.left} {matches[p.left] ? `→ ${matches[p.left]}` : ""}</button>
          ))}
        </div>
        <div className="space-y-2">
          {rights.map((r) => (
            <button key={r} onClick={() => handleRight(r)} className="w-full rounded border bg-white p-2 text-left text-sm hover:bg-gray-50">{r}</button>
          ))}
        </div>
      </div>
      <button onClick={() => onSubmit({ matches })} className="rounded bg-primary px-4 py-2 text-white">Submit</button>
      <button onClick={() => setMatches({})} className="ml-2 rounded border px-4 py-2 text-sm">Clear</button>
    </div>
  );
}
