"use client";
import { useState } from "react";

export function BadgeShare({ code, title }: { code: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/badges/${code}` : `/badges/${code}`;
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `I earned ${title}!`, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2">
      <button onClick={share} className="rounded bg-primary px-4 py-2 text-sm text-white" aria-label="Share badge">
        {copied ? "Copied!" : "Share"}
      </button>
      <span className="text-xs text-gray-500">{url}</span>
    </div>
  );
}
