"use client";
import { usePreferencesStore } from "../../lib/stores/preferences";

export function NavigationToggle() {
  const { navigationMode, setNavigationMode } = usePreferencesStore();
  return (
    <div className="flex items-center gap-2 rounded-full border p-1 text-sm">
      {(["free", "linear"] as const).map((m) => (
        <button key={m} onClick={() => setNavigationMode(m)} className={`rounded-full px-3 py-1 capitalize ${navigationMode === m ? "bg-primary text-white" : "text-gray-600"}`}>{m}</button>
      ))}
    </div>
  );
}
