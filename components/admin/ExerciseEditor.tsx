"use client";
import { useState } from "react";

const TYPES = ["fill_blanks","ordering","transformation","flashcard","matching","listening_tts","dictation","comprehension","graded_reading","writing_prompt","speaking_record","shadowing","pronunciation"] as const;

export function ExerciseEditor({ lessonId }: { lessonId?: string }) {
  const [type, setType] = useState<typeof TYPES[number]>("fill_blanks");
  const [prompt, setPrompt] = useState<string>(JSON.stringify({ text: "Example prompt" }, null, 2));
  const [solution, setSolution] = useState<string>(JSON.stringify({ answer: "example" }, null, 2));
  const [msg, setMsg] = useState<string>("");

  const submit = async () => {
    setMsg("Submitting...");
    try {
      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lessonId ?? "00000000-0000-0000-0000-000000000000", type, difficulty: 3, prompt: JSON.parse(prompt), solution: JSON.parse(solution) }),
      });
      const data = await res.json();
      setMsg(res.ok ? "Saved: " + data.id : "Error: " + JSON.stringify(data.error));
    } catch (e) { setMsg("Error: " + String(e)); }
  };

  return (
    <div className="rounded border p-4 dark:border-gray-700" aria-label="Exercise editor">
      <h3 className="font-semibold">Exercise Editor — 13 types</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs">Type
          <select value={type} onChange={(e)=>setType(e.target.value as never)} className="w-full rounded border px-2 py-1" aria-label="Exercise type">
            {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs">Lesson ID
          <input value={lessonId ?? ""} readOnly placeholder="Uses current lesson" className="w-full rounded border bg-gray-50 px-2 py-1 text-xs" />
        </label>
      </div>
      <label className="mt-2 block text-xs">Prompt JSON (per Zod schema, ai_generated flag optional)
        <textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} rows={4} className="w-full rounded border px-2 py-1 font-mono text-xs" aria-label="Prompt JSON" />
      </label>
      <label className="mt-2 block text-xs">Solution JSON
        <textarea value={solution} onChange={(e)=>setSolution(e.target.value)} rows={4} className="w-full rounded border px-2 py-1 font-mono text-xs" aria-label="Solution JSON" />
      </label>
      <button onClick={submit} className="mt-3 rounded bg-primary px-4 py-2 text-sm text-white" aria-label="Save exercise">Save Exercise</button>
      {msg ? <p className="mt-2 text-xs" aria-live="polite">{msg}</p> : null}
    </div>
  );
}
