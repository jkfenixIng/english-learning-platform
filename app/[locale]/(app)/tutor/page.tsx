"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";

export default function TutorPage() {
  const t = useTranslations("tutor");
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
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: t("unavailable") }]);
    }
    setLoading(false);
  };
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <div className="h-96 space-y-2 overflow-auto rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {messages.length === 0 ? <p className="text-sm text-gray-500">{t("emptyState")}</p> : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded p-2 text-sm ${m.role === "user" ? "bg-primary/15 ml-8 text-slate-900 dark:text-slate-100" : "mr-8 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"}`}
          >
            {m.content}
          </div>
        ))}
        {loading ? <p className="text-xs text-gray-400">{t("thinking")}</p> : null}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("placeholder")}
          className="flex-1"
        />
        <button onClick={send} className="bg-primary rounded px-4 py-2 text-white hover:opacity-90">
          {t("send")}
        </button>
      </div>
    </div>
  );
}
