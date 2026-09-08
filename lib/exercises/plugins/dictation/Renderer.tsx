"use client";
import { useState } from "react";
import { speakText } from "../../../speech/tts";
import type { DictationPrompt, DictationAnswer } from "./schema";
export function DictationRenderer({ prompt, onSubmit }: { prompt: DictationPrompt; onSubmit: (a: DictationAnswer) => void }) {
  const [text, setText] = useState("");
  const [plays, setPlays] = useState(0);
  const play = () => { speakText(prompt.text); setPlays((c) => c + 1); };
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Listen and transcribe what you hear.</p>
      <button onClick={play} className="rounded bg-indigo-600 px-4 py-2 text-white">▶ Play ({plays}/{prompt.playsAllowed})</button>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type what you heard" rows={3} className="w-full rounded border px-3 py-2" />
      <button onClick={() => onSubmit({ text })} className="rounded bg-indigo-600 px-4 py-2 text-white">Submit</button>
    </div>
  );
}
