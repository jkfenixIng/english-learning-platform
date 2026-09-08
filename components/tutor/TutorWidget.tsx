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
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...messages, userMsg] }) });
      const data = await res.json() as { reply: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "No reply" }]);
    } catch { setMessages((m) => [...m, { role: "assistant", content: "Tutor unavailable right now." }]); }
    setLoading(false);
  };

  if (!open) return <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 rounded-full bg-primary p-4 text-white shadow-lg">💬</button>;
  return (
    <div className="fixed bottom-4 right-4 flex h-96 w-80 flex-col rounded-xl border bg-white shadow-xl dark:bg-gray-900">
      <div className="flex items-center justify-between border-b p-3"><span className="font-semibold">AI Tutor</span><button onClick={() => setOpen(false)} className="text-sm">✕</button></div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {messages.length === 0 ? <p className="text-sm text-gray-500">Ask me anything about English!</p> : null}
        {messages.map((m, i) => <div key={i} className={`rounded p-2 text-sm ${m.role === "user" ? "bg-indigo-100 ml-8" : "bg-gray-100 mr-8"}`}>{m.content}</div>)}
        {loading ? <p className="text-xs text-gray-400">Thinking...</p> : null}
      </div>
      <div className="flex gap-2 border-t p-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask..." className="flex-1 rounded border px-2 py-1 text-sm" />
        <button onClick={send} className="rounded bg-primary px-3 py-1 text-sm text-white">Send</button>
      </div>
    </div>
  );
}
