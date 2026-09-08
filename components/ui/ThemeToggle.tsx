"use client";
import { useEffect } from "react";
import { usePreferencesStore } from "../../lib/stores/preferences";

export function ThemeToggle() {
  const { theme, setTheme } = usePreferencesStore();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="rounded-full border p-2 text-sm"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
