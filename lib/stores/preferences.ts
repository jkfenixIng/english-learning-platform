"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NavigationMode = "linear" | "free";
export type ProgressionMode = "unlocked" | "locked";
export type Theme = "light" | "dark";
export type Locale = "en" | "es";

interface PreferencesState {
  navigationMode: NavigationMode;
  progressionMode: ProgressionMode;
  locale: Locale;
  theme: Theme;
  setNavigationMode: (mode: NavigationMode) => void;
  setProgressionMode: (mode: ProgressionMode) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      navigationMode: "free",
      progressionMode: "unlocked",
      locale: "en",
      theme: "light",
      setNavigationMode: (navigationMode) => set({ navigationMode }),
      setProgressionMode: (progressionMode) => set({ progressionMode }),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "elp-preferences" },
  ),
);
