"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NavigationMode = "linear" | "free";
export type ProgressionMode = "unlocked" | "locked";
export type Theme = "light" | "dark" | "ocean" | "midnight" | "forest" | "sunset" | "aurora";
export type Locale = "en" | "es";

interface PreferencesState {
  navigationMode: NavigationMode;
  progressionMode: ProgressionMode;
  locale: Locale;
  theme: Theme;
  srsEnabled: boolean;
  challengesEnabled: boolean;
  emailNotifications: boolean;
  sidebarCollapsed: boolean;
  setNavigationMode: (mode: NavigationMode) => void;
  setProgressionMode: (mode: ProgressionMode) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setSrsEnabled: (v: boolean) => void;
  setChallengesEnabled: (v: boolean) => void;
  setEmailNotifications: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      navigationMode: "free",
      progressionMode: "unlocked",
      locale: "en",
      theme: "light",
      srsEnabled: true,
      challengesEnabled: true,
      emailNotifications: false,
      sidebarCollapsed: false,
      setNavigationMode: (navigationMode) => set({ navigationMode }),
      setProgressionMode: (progressionMode) => set({ progressionMode }),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setSrsEnabled: (srsEnabled) => set({ srsEnabled }),
      setChallengesEnabled: (challengesEnabled) => set({ challengesEnabled }),
      setEmailNotifications: (emailNotifications) => set({ emailNotifications }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: "elp-preferences" },
  ),
);
