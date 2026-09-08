"use client";
import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const onBefore = (e: Event) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBefore as never);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBefore as never); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  const install = async () => {
    if (!deferred) return;
    const ev = deferred as unknown as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    await ev.prompt();
    await ev.userChoice;
    setDeferred(null);
  };
  if (installed || !deferred) return null;
  return (
    <div className="rounded border bg-indigo-50 p-3 dark:bg-indigo-950" aria-label="Install PWA prompt">
      <p className="text-sm font-medium">Install ELP for offline reviews</p>
      <button onClick={install} className="mt-2 rounded bg-primary px-3 py-1 text-xs text-white" aria-label="Install app">Install</button>
    </div>
  );
}
