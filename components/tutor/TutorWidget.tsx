"use client";
import { useState } from "react";

export function TutorWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = (await res.json()) as { reply: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "No reply" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Tutor unavailable right now." }]);
    }
    setLoading(false);
  };

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-primary fixed right-4 bottom-4 rounded-full p-4 text-white shadow-lg"
      >
        💬
      </button>
    );
  return (
    <div className="fixed right-4 bottom-4 flex h-96 w-80 flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b p-3">
        <span className="font-semibold">AI Tutor</span>
        <button onClick={() => setOpen(false)} className="text-sm">
          ✕
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-auto p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">Ask me anything about English!</p>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded p-2 text-sm ${m.role === "user" ? "ml-8 bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100" : "mr-8 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"}`}
          >
            {m.content}
          </div>
        ))}
        {loading ? <p className="text-xs text-gray-400">Thinking...</p> : null}
      </div>
      <div className="flex gap-2 border-t p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask..."
          className="focus-visible:ring-primary-500 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button onClick={send} className="bg-primary rounded px-3 py-1 text-sm text-white">
          Send
        </button>
      </div>
    </div>
  );
}
