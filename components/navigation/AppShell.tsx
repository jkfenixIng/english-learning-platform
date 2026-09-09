"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { OfflineBanner } from "../pwa/OfflineBanner";
import { InstallPrompt } from "../pwa/InstallPrompt";
import { TutorWidget } from "../tutor/TutorWidget";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock scroll when drawer open on mobile, and handle Escape
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
        <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-h-screen flex-1 flex-col lg:pl-[272px]">
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8">
            <div className="mb-4">
              <InstallPrompt />
            </div>
            {children}
          </main>
          <footer className="border-t bg-white/60 px-4 py-3 text-center text-xs text-slate-500 backdrop-blur lg:px-8 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            <span className="font-medium tracking-wide">ELP</span> — Learn English from A1 to C2
          </footer>
        </div>
      </div>
      <TutorWidget />
    </div>
  );
}
