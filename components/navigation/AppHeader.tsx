"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "../ui/ThemeToggle";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/levels": "Levels",
  "/reviews": "Reviews",
  "/challenges": "Challenges",
  "/leaderboard": "Leaderboard",
  "/shop": "Shop",
  "/tutor": "AI Tutor",
  "/settings": "Settings",
  "/admin": "Admin",
};

function normalize(pathname: string) {
  const m = pathname.match(/^\/(en|es)(\/|$)/);
  if (m) {
    const stripped = pathname.slice(3);
    return stripped === "" ? "/" : stripped;
  }
  return pathname || "/";
}

function titleFor(pathname: string) {
  const norm = normalize(pathname);
  // exact or prefix
  for (const [key, label] of Object.entries(TITLES)) {
    if (norm === key || norm.startsWith(key + "/")) return label;
  }
  // fallback: first segment
  const seg = norm.split("/").filter(Boolean)[0];
  if (!seg) return "Dashboard";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = titleFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between gap-3 border-b bg-white/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 lg:px-6 dark:border-slate-800 dark:bg-slate-900/70 dark:supports-[backdrop-filter]:bg-slate-900/60">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="hover:bg-muted inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-slate-700 shadow-sm transition lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M5 7h14M5 12h14M5 17h14" strokeLinecap="round" />
          </svg>
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <span className="hidden rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-500 sm:inline-flex dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
              {normalize(pathname)}
            </span>
          </div>
          <p className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">
            Learn English from A1 to C2 — at your own pace
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/tutor"
          className="hover:bg-muted hidden items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition sm:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-violet-500" />
          Ask Tutor
        </Link>
        <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800" aria-hidden />
        <ThemeToggle />
        <Link
          href="/settings"
          aria-label="Settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
        >
          <span className="text-xs font-bold">E</span>
        </Link>
      </div>
    </header>
  );
}
