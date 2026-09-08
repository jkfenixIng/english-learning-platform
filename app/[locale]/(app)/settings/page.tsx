"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePreferencesStore } from "../../../../lib/stores/preferences";
import { useOnlineStatus } from "../../../../lib/hooks/useOnlineStatus";

type AiSettings = { provider: string; model: string | null; enabled: boolean; hasKey: boolean };

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

  const [ai, setAi] = useState<AiSettings>({
    provider: "mock",
    model: null,
    enabled: false,
    hasKey: false,
  });
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/ai");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AiSettings;
        if (!cancelled) {
          setAi(data);
          setModelInput(data.model ?? "");
        }
      } catch {
        // not authenticated or no settings yet
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLocaleChange = (l: "en" | "es") => {
    setLocale(l);
    document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  const saveAi = async () => {
    setAiSaving(true);
    setAiMsg(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: ai.provider,
          apiKey: apiKeyInput || undefined,
          model: modelInput || null,
          enabled: ai.enabled,
        }),
      });
      const data = (await res.json()) as AiSettings & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setAi(data);
      setApiKeyInput("");
      setAiMsg("Saved");
    } catch (e) {
      setAiMsg(String(e));
    } finally {
      setAiSaving(false);
    }
  };

  const revokeAi = async () => {
    setAiSaving(true);
    try {
      await fetch("/api/settings/ai", { method: "DELETE" });
      setAi({ provider: "mock", model: null, enabled: false, hasKey: false });
      setModelInput("");
      setApiKeyInput("");
      setAiMsg("Revoked");
    } catch (e) {
      setAiMsg(String(e));
    } finally {
      setAiSaving(false);
    }
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
                className={`rounded px-3 py-1 text-sm capitalize ${navigationMode === m ? "bg-primary text-white" : "border"}`}
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
                className={`rounded px-3 py-1 text-sm capitalize ${progressionMode === m ? "bg-primary text-white" : "border"}`}
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
                className={`rounded px-3 py-1 text-sm uppercase ${locale === l ? "bg-primary text-white" : "border"}`}
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
                className={`rounded px-3 py-1 text-sm capitalize ${theme === t ? "bg-primary text-white" : "border"}`}
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

      <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
        <h2 className="text-sm font-semibold">AI Tutor — Optional (BYOK)</h2>
        <p className="mt-1 text-xs text-gray-500">
          Bring your own key. Your API key is stored encrypted and never shown again. Leave empty to
          use mock.
        </p>
        {aiLoading ? (
          <p className="mt-3 text-xs text-gray-400">Loading AI settings...</p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={ai.enabled}
                onChange={(e) => setAi((s) => ({ ...s, enabled: e.target.checked }))}
                aria-label="Enable AI Tutor"
              />
            </label>

            <div>
              <label className="text-xs font-medium">Provider</label>
              <select
                value={ai.provider}
                onChange={(e) => setAi((s) => ({ ...s, provider: e.target.value }))}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                aria-label="AI provider"
              >
                <option value="mock">mock (no key, demo)</option>
                <option value="openrouter">openrouter</option>
                <option value="groq">groq</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium">API key</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-or-v1-... or gsk_..."
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                aria-label="API key"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-500">
                {ai.hasKey ? (
                  <span className="text-emerald-600">● Key saved</span>
                ) : (
                  <span className="text-gray-400">No key saved</span>
                )}{" "}
                — leave empty to keep existing.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium">Model (optional)</label>
              <input
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="meta-llama/llama-3.1-8b:free"
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                aria-label="Model"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveAi}
                disabled={aiSaving}
                className="bg-primary rounded px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                aria-label="Save AI settings"
              >
                {aiSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={revokeAi}
                disabled={aiSaving}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
                aria-label="Revoke AI key"
              >
                Revoke
              </button>
            </div>
            {aiMsg ? <p className="text-xs text-gray-500">{aiMsg}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
