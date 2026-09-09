"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePreferencesStore } from "../../../../lib/stores/preferences";
import { useOnlineStatus } from "../../../../lib/hooks/useOnlineStatus";

type AiSettings = { provider: string; model: string | null; enabled: boolean; hasKey: boolean };

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const t = useTranslations("settings");
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

  // Keep Zustand locale in sync with the actual URL locale (as-needed: en has no prefix, es has /es)
  // Without this, direct navigation to /es/settings shows Zustand default "en" as active.
  useEffect(() => {
    if (currentLocale !== locale) {
      setLocale(currentLocale as "en" | "es");
    }
  }, [currentLocale, locale, setLocale]);

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
    // With localePrefix: as-needed, en has no prefix, es has /es.
    // Cookie alone + router.refresh() does NOT change the URL prefix, and URL prefix wins over cookie.
    // So we must push to the prefixed path when switching to es, and strip it when switching to en.
    const stripped = pathname.replace(/^\/(en|es)(?=\/|$)/, "") || "/";
    const normalized = stripped.startsWith("/") ? stripped : `/${stripped}`;
    const target = l === "es" ? `/es${normalized === "/" ? "" : normalized}` : normalized;
    const finalTarget = target === "" ? "/" : target;
    if (finalTarget !== pathname) {
      router.push(finalTarget);
    } else {
      router.refresh();
    }
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
      if (!res.ok) throw new Error(data.error ?? t("saveFailed"));
      setAi(data);
      setApiKeyInput("");
      setAiMsg(t("saved"));
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
      setAiMsg(t("revoked"));
    } catch (e) {
      setAiMsg(String(e));
    } finally {
      setAiSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <div className="space-y-4 rounded-xl border bg-white p-4 dark:bg-gray-900">
        <div>
          <p className="text-sm font-medium">{t("navigationMode")}</p>
          <div className="mt-2 flex gap-2">
            {(["free", "linear"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setNavigationMode(m)}
                className={`rounded px-3 py-1 text-sm capitalize ${navigationMode === m ? "bg-primary text-white" : "border"}`}
              >
                {m === "free" ? t("free") : t("linear")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">{t("progressionMode")}</p>
          <div className="mt-2 flex gap-2">
            {(["unlocked", "locked"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setProgressionMode(m)}
                className={`rounded px-3 py-1 text-sm capitalize ${progressionMode === m ? "bg-primary text-white" : "border"}`}
              >
                {m === "unlocked" ? t("unlocked") : t("locked")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">{t("locale")}</p>
          <div className="mt-2 flex gap-2">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                onClick={() => handleLocaleChange(l)}
                className={`rounded px-3 py-1 text-sm uppercase ${currentLocale === l ? "bg-primary text-white" : "border"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">{t("theme")}</p>
          <div className="mt-2 flex gap-2">
            {(["light", "dark"] as const).map((tKey) => (
              <button
                key={tKey}
                onClick={() => setTheme(tKey)}
                className={`rounded px-3 py-1 text-sm capitalize ${theme === tKey ? "bg-primary text-white" : "border"}`}
              >
                {tKey === "light" ? t("light") : t("dark")}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3 border-t pt-4">
          <label className="flex items-center justify-between text-sm">
            <span>{t("srsEnabled")}</span>
            <input
              type="checkbox"
              checked={srsEnabled}
              onChange={(e) => setSrsEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>{t("challengesEnabled")}</span>
            <input
              type="checkbox"
              checked={challengesEnabled}
              onChange={(e) => setChallengesEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>{t("emailNotifications")}</span>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
            />
          </label>
          <p className="text-xs text-gray-400">
            {t("offlinePrefix")} {online ? t("offlineOnline") : t("offlineOffline")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
        <h2 className="text-sm font-semibold">{t("aiTitle")}</h2>
        <p className="mt-1 text-xs text-gray-500">{t("aiDesc")}</p>
        {aiLoading ? (
          <p className="mt-3 text-xs text-gray-400">{t("loadingAi")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span>{t("enabled")}</span>
              <input
                type="checkbox"
                checked={ai.enabled}
                onChange={(e) => setAi((s) => ({ ...s, enabled: e.target.checked }))}
                aria-label={t("enableAiAria")}
              />
            </label>

            <div>
              <label className="text-xs font-medium">{t("provider")}</label>
              <select
                value={ai.provider}
                onChange={(e) => setAi((s) => ({ ...s, provider: e.target.value }))}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                aria-label={t("providerAria")}
              >
                <option value="mock">{t("providerMock")}</option>
                <option value="openrouter">{t("providerOpenrouter")}</option>
                <option value="groq">{t("providerGroq")}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium">{t("apiKey")}</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={t("apiKeyPlaceholder")}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                aria-label={t("apiKeyAria")}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-500">
                {ai.hasKey ? (
                  <span className="text-emerald-600">{t("keySaved")}</span>
                ) : (
                  <span className="text-gray-400">{t("noKeySaved")}</span>
                )}{" "}
                {t("keepExisting")}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium">{t("modelLabel")}</label>
              <input
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder={t("modelPlaceholder")}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                aria-label={t("modelAria")}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveAi}
                disabled={aiSaving}
                className="bg-primary rounded px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                aria-label={t("saveAiAria")}
              >
                {aiSaving ? t("saving") : t("save")}
              </button>
              <button
                onClick={revokeAi}
                disabled={aiSaving}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
                aria-label={t("revokeAiAria")}
              >
                {t("revoke")}
              </button>
            </div>
            {aiMsg ? <p className="text-xs text-gray-500">{aiMsg}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
