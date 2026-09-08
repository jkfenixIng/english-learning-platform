"use client";
import { useState } from "react";
import type { OrderingPrompt, OrderingAnswer } from "./schema";
export function OrderingRenderer({ prompt, onSubmit }: { prompt: OrderingPrompt; onSubmit: (a: OrderingAnswer) => void }) {
  const [order, setOrder] = useState<string[]>([...prompt.tokens].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (token: string) => {
    if (selected.includes(token)) setSelected(selected.filter((t) => t !== token));
    else setSelected([...selected, token]);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Click tokens to build the sentence in order:</p>
      <div className="flex flex-wrap gap-2">
        {order.map((t) => (
          <button key={t} onClick={() => toggle(t)} className={`rounded-full border px-3 py-1 text-sm ${selected.includes(t) ? "bg-indigo-600 text-white" : "bg-white"}`}>{t}</button>
        ))}
      </div>
      <div className="min-h-10 rounded border bg-gray-50 p-2 text-sm">{selected.join(" ") || "—"}</div>
      <div className="flex gap-2">
        <button onClick={() => setSelected([])} className="rounded border px-3 py-2 text-sm">Clear</button>
        <button onClick={() => onSubmit({ order: selected })} className="rounded bg-indigo-600 px-4 py-2 text-sm text-white">Submit</button>
      </div>
    </div>
  );
}
