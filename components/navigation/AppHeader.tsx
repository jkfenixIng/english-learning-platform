"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "../ui/ThemeToggle";

function normalize(pathname: string) {
  const m = pathname.match(/^\/(en|es)(\/|$)/);
  if (m) {
    const stripped = pathname.slice(3);
    return stripped === "" ? "/" : stripped;
  }
  return pathname || "/";
}

function IconCollapse({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-5 w-5"
      aria-hidden
    >
      {collapsed ? (
        <path d="M11 5l6 7-6 7M6 5l6 7-6 7" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M13 5L7 12l6 7M18 5l-6 7 6 7" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function AppHeader({
  onMenuClick,
  onToggle,
  collapsed = false,
}: {
  onMenuClick: () => void;
  onToggle?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const tHeader = useTranslations("appHeader");
  const tTitles = useTranslations("appHeader.titles");

  const TITLES: Record<string, string> = {
    "/dashboard": tTitles("dashboard"),
    "/levels": tTitles("levels"),
    "/reviews": tTitles("reviews"),
    "/challenges": tTitles("challenges"),
    "/leaderboard": tTitles("leaderboard"),
    "/shop": tTitles("shop"),
    "/tutor": tTitles("tutor"),
    "/settings": tTitles("settings"),
    "/admin": tTitles("admin"),
  };

  function titleFor(path: string) {
    const norm = normalize(path);
    for (const [key, label] of Object.entries(TITLES)) {
      if (norm === key || norm.startsWith(key + "/")) return label;
    }
    const seg = norm.split("/").filter(Boolean)[0];
    if (!seg) return tTitles("fallback");
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  }

  const title = titleFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between gap-3 border-b bg-white/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 lg:px-6 dark:border-slate-800 dark:bg-slate-900/70 dark:supports-[backdrop-filter]:bg-slate-900/60">
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          aria-label={tHeader("openNav")}
          className="hover:bg-muted inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-slate-700 shadow-sm transition motion-reduce:transition-none lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
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

        {/* Desktop collapse toggle */}
        {onToggle && (
          <button
            onClick={onToggle}
            aria-label={collapsed ? tHeader("expandSidebar") : tHeader("collapseSidebar")}
            aria-expanded={!collapsed}
            title={collapsed ? tHeader("expandSidebar") : tHeader("collapseSidebar")}
            className="hover:bg-muted hidden h-9 w-9 items-center justify-center rounded-xl border bg-white text-slate-600 shadow-sm transition motion-reduce:transition-none lg:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <IconCollapse collapsed={collapsed} />
          </button>
        )}

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
            {tHeader("tagline")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/tutor"
          className="hover:bg-muted hidden items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition motion-reduce:transition-none sm:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-violet-500" />
          {tHeader("askTutor")}
        </Link>
        <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800" aria-hidden />
        <ThemeToggle />
        <Link
          href="/settings"
          aria-label={tTitles("settings")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 motion-reduce:transition-none dark:bg-white dark:text-slate-900"
        >
          <span className="text-xs font-bold">E</span>
        </Link>
      </div>
    </header>
  );
}
