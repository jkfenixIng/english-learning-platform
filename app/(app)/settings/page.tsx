"use client";
import { usePreferencesStore } from "../../../lib/stores/preferences";

export default function SettingsPage() {
  const { navigationMode, progressionMode, locale, theme, setNavigationMode, setProgressionMode, setLocale, setTheme } = usePreferencesStore();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="rounded-xl border bg-white p-4 dark:bg-gray-900 space-y-4">
        <div>
          <p className="text-sm font-medium">Navigation mode</p>
          <div className="mt-2 flex gap-2">
            {(["free", "linear"] as const).map((m) => <button key={m} onClick={() => setNavigationMode(m)} className={`rounded px-3 py-1 text-sm capitalize ${navigationMode === m ? "bg-indigo-600 text-white" : "border"}`}>{m}</button>)}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Progression</p>
          <div className="mt-2 flex gap-2">
            {(["unlocked", "locked"] as const).map((m) => <button key={m} onClick={() => setProgressionMode(m)} className={`rounded px-3 py-1 text-sm capitalize ${progressionMode === m ? "bg-indigo-600 text-white" : "border"}`}>{m}</button>)}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Language</p>
          <div className="mt-2 flex gap-2">
            {(["en", "es"] as const).map((l) => <button key={l} onClick={() => setLocale(l)} className={`rounded px-3 py-1 text-sm uppercase ${locale === l ? "bg-indigo-600 text-white" : "border"}`}>{l}</button>)}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Theme</p>
          <div className="mt-2 flex gap-2">
            {(["light", "dark"] as const).map((t) => <button key={t} onClick={() => setTheme(t)} className={`rounded px-3 py-1 text-sm capitalize ${theme === t ? "bg-indigo-600 text-white" : "border"}`}>{t}</button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
