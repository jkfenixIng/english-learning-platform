"use client";
import { useState } from "react";
import type { FlashcardPrompt, FlashcardAnswer } from "./schema";
export function FlashcardRenderer({ prompt, onSubmit }: { prompt: FlashcardPrompt; onSubmit: (a: FlashcardAnswer) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState("");
  return (
    <div className="space-y-4">
      <div onClick={() => setFlipped(!flipped)} className="cursor-pointer rounded-xl border bg-white p-6 text-center shadow transition hover:shadow-md">
        {prompt.imageUrl ? <img src={prompt.imageUrl} alt="" className="mx-auto mb-3 max-h-32 rounded" /> : null}
        <p className="text-lg font-semibold">{flipped ? prompt.back : prompt.front}</p>
        <p className="mt-2 text-xs text-gray-500">{flipped ? "Click to flip back" : "Click to reveal"}</p>
      </div>
      <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type the translation (optional)" className="w-full rounded border px-3 py-2" />
      <div className="flex gap-2">
        <button onClick={() => onSubmit({ revealed: true, typed: typed || undefined })} className="rounded bg-primary px-4 py-2 text-white">I reviewed it</button>
        <button onClick={() => setFlipped(!flipped)} className="rounded border px-4 py-2">{flipped ? "Hide" : "Reveal"}</button>
      </div>
    </div>
  );
}
