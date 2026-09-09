"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { usePreferencesStore } from "@/lib/stores/preferences";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { OfflineBanner } from "../pwa/OfflineBanner";
import { InstallPrompt } from "../pwa/InstallPrompt";
import { TutorWidget } from "../tutor/TutorWidget";

export function AppShellClient({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = usePreferencesStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = usePreferencesStore((s) => s.setSidebarCollapsed);
  const tShell = useTranslations("appShell");

  // Lock scroll when drawer open on mobile, and handle Escape (mobile only)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) {
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[#f8f7f5] dark:bg-slate-950">
      <OfflineBanner />
      <div className="flex min-h-screen">
        <AppSidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          isAdmin={isAdmin}
        />
        <div
          className={cn(
            "flex min-h-screen flex-1 flex-col transition-all duration-200 ease-out motion-reduce:transition-none",
            collapsed ? "lg:pl-[72px]" : "lg:pl-[272px]",
          )}
        >
          <AppHeader
            onMenuClick={() => setMobileOpen(true)}
            onToggle={() => setSidebarCollapsed(!collapsed)}
            collapsed={collapsed}
          />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8">
            <div className="mb-4">
              <InstallPrompt />
            </div>
            {children}
          </main>
          <footer className="border-t bg-white/60 px-4 py-3 text-center text-xs text-slate-500 backdrop-blur lg:px-8 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            <span className="font-medium tracking-wide">ELP</span> — {tShell("footer")}
          </footer>
        </div>
      </div>
      <TutorWidget />
    </div>
  );
}
