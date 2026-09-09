"use client";
import { useEffect } from "react";
import { usePreferencesStore } from "../../lib/stores/preferences";

const DARK_THEMES = new Set(["dark", "midnight", "aurora"]);

export function ThemeToggle() {
  const { theme, setTheme } = usePreferencesStore();
  useEffect(() => {
    const isDark = DARK_THEMES.has(theme);
    document.documentElement.classList.toggle("dark", isDark);
    if (theme === "light" || theme === "dark") {
      document.documentElement.removeAttribute("data-theme");
      if (theme === "dark") document.documentElement.dataset.theme = "dark";
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="rounded-full border p-2 text-sm"
    >
      {DARK_THEMES.has(theme) ? "☀️" : "🌙"}
    </button>
  );
}
