"use client";
import { useRouter } from "next/navigation";
import { usePreferencesStore } from "../../../../lib/stores/preferences";
import { useOnlineStatus } from "../../../../lib/hooks/useOnlineStatus";

export default function SettingsPage() {
  const router = useRouter();
  const {
    navigationMode,
    progressionMode,
    locale,
    theme,
    srsEnabled,
    challengesEnabled,
    emailNotifications,
    setNavigationMode,
    setProgressionMode,
    setLocale,
    setTheme,
    setSrsEnabled,
    setChallengesEnabled,
    setEmailNotifications,
  } = usePreferencesStore();
  const online = useOnlineStatus();

  const handleLocaleChange = (l: "en" | "es") => {
    setLocale(l);
    document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="space-y-4 rounded-xl border bg-white p-4 dark:bg-gray-900">
        <div>
          <p className="text-sm font-medium">Navigation mode</p>
          <div className="mt-2 flex gap-2">
            {(["free", "linear"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setNavigationMode(m)}
                className={`rounded px-3 py-1 text-sm capitalize ${navigationMode === m ? "bg-indigo-600 text-white" : "border"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Progression</p>
          <div className="mt-2 flex gap-2">
            {(["unlocked", "locked"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setProgressionMode(m)}
                className={`rounded px-3 py-1 text-sm capitalize ${progressionMode === m ? "bg-indigo-600 text-white" : "border"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Language</p>
          <div className="mt-2 flex gap-2">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                onClick={() => handleLocaleChange(l)}
                className={`rounded px-3 py-1 text-sm uppercase ${locale === l ? "bg-indigo-600 text-white" : "border"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Theme</p>
          <div className="mt-2 flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded px-3 py-1 text-sm capitalize ${theme === t ? "bg-indigo-600 text-white" : "border"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3 border-t pt-4">
          <label className="flex items-center justify-between text-sm">
            <span>SRS (spaced repetition)</span>
            <input
              type="checkbox"
              checked={srsEnabled}
              onChange={(e) => setSrsEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Challenges opt-in</span>
            <input
              type="checkbox"
              checked={challengesEnabled}
              onChange={(e) => setChallengesEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Email notifications (Resend)</span>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
            />
          </label>
          <p className="text-xs text-gray-400">
            Offline: {online ? "online" : "offline — reviews cached via IndexedDB"}
          </p>
        </div>
      </div>
    </div>
  );
}
