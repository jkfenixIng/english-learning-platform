"use client";
import { useState } from "react";
export default function AdminSeedPage() {
  const [msg, setMsg] = useState<string>("");
  const run = async () => {
    setMsg("Triggering...");
    const res = await fetch("/api/admin/seed", { method: "POST" });
    const data = await res.json();
    setMsg(res.ok ? data.message : data.error ?? "Error");
  };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Seed Re-run (idempotent)</h1>
      <p className="text-sm text-gray-600">Trigger <code>POST /api/admin/seed</code> — rerun is safe; upsert by natural key (level code, unit order, lesson order, badge code, challenge title). Re-run shows count and does not duplicate (spec E10).</p>
      <button onClick={run} className="rounded bg-primary px-4 py-2 text-sm text-white" aria-label="Run seed">Re-run Seed</button>
      {msg ? <p className="rounded bg-gray-50 p-3 text-sm dark:bg-gray-900" aria-live="polite">{msg}</p> : null}
    </div>
  );
}
