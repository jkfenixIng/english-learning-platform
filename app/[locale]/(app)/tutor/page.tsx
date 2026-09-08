"use client";
import { useState } from "react";

export default function TutorPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    setMessages((m) => [...m, userMsg]); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...messages, userMsg] }) });
      const data = await res.json() as { reply: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch { setMessages((m) => [...m, { role: "assistant", content: "Tutor unavailable" }]); }
    setLoading(false);
  };
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">AI Tutor</h1>
      <div className="h-96 overflow-auto rounded border bg-white p-4 dark:bg-gray-900 space-y-2">
        {messages.length === 0 ? <p className="text-sm text-gray-500">Ask me anything — e.g., explain past perfect</p> : null}
        {messages.map((m, i) => <div key={i} className={`rounded p-2 text-sm ${m.role === "user" ? "bg-indigo-100 ml-8" : "bg-gray-100 mr-8"}`}>{m.content}</div>)}
        {loading ? <p className="text-xs text-gray-400">Thinking...</p> : null}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask the tutor..." className="flex-1 rounded border px-3 py-2" />
        <button onClick={send} className="rounded bg-indigo-600 px-4 py-2 text-white">Send</button>
      </div>
    </div>
  );
}
