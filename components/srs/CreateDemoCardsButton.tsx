"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function CreateDemoCardsButton({ locale: _locale }: { locale: string }) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleCreate() {
    setLoading(true);
    setMsg(null);
    setIsError(false);
    try {
      const res = await fetch("/api/srs/demo", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; created?: number };
      if (!res.ok) throw new Error(data.error ?? t("demoError"));
      setMsg(t("demoCreated"));
      startTransition(() => router.refresh());
      // fallback hard refresh after short delay to fetch new cards
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setIsError(true);
      setMsg(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleCreate}
        disabled={loading || isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
      >
        {loading ? t("creatingDemo") : t("createDemo")}
      </button>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("demoHint")}</p>
      {msg && (
        <p
          className={`mt-1 text-xs ${isError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

export default CreateDemoCardsButton;
