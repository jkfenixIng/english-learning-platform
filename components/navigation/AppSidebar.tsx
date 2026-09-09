"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: string;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

/* ---- minimal, desaturated icons (inline SVG, no extra deps) ---- */
function IconDashboard(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <path
        d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconLevels(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 17.5V5.5Z" />
      <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
    </svg>
  );
}
function IconTutor(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6 16.3 7.7M7.7 16.3 5.6 18.4"
        strokeLinecap="round"
      />
      <circle cx={12} cy={12} r={4} />
    </svg>
  );
}
function IconReviews(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <path d="M12 6v6l3 2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={12} cy={12} r={9} />
      <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" opacity={0.35} />
    </svg>
  );
}
function IconChallenges(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <path d="M8 21h8M12 17a5 5 0 0 0 5-5V7H7v5a5 5 0 0 0 5 5Z" />
      <path d="M7 7H5a3 3 0 0 0 3 3M17 7h2a3 3 0 0 1-3 3" />
    </svg>
  );
}
function IconLeaderboard(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <path d="M6 18V11M12 18V7M18 18v-4" strokeLinecap="round" />
      <path d="M3 18h18" strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}
function IconShop(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <path d="M6 7h12l-1 10H7L6 7Z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}
function IconSettings(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <circle cx={12} cy={12} r={3} />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17 5.6 18.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconAdmin(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={props.className}
      aria-hidden
    >
      <path d="M12 3 5 7v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V7L12 3Z" strokeLinejoin="round" />
      <path d="M9 12 11.2 14.2 15 9.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON = "h-[18px] w-[18px] shrink-0";

const sections: NavSection[] = [
  {
    title: "Learn",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <IconDashboard className={ICON} />,
        match: "/dashboard",
      },
      {
        href: "/levels/A1",
        label: "Levels",
        icon: <IconLevels className={ICON} />,
        match: "/levels",
      },
      { href: "/tutor", label: "AI Tutor", icon: <IconTutor className={ICON} />, badge: "AI" },
    ],
  },
  {
    title: "Progress",
    items: [
      { href: "/reviews", label: "Reviews", icon: <IconReviews className={ICON} /> },
      { href: "/challenges", label: "Challenges", icon: <IconChallenges className={ICON} /> },
    ],
  },
  {
    title: "Social",
    items: [
      { href: "/leaderboard", label: "Leaderboard", icon: <IconLeaderboard className={ICON} /> },
      { href: "/shop", label: "Shop", icon: <IconShop className={ICON} /> },
    ],
  },
  {
    title: "System",
    items: [{ href: "/settings", label: "Settings", icon: <IconSettings className={ICON} /> }],
  },
  {
    title: "Admin",
    items: [{ href: "/admin", label: "Admin", icon: <IconAdmin className={ICON} /> }],
  },
];

function normalizePath(pathname: string) {
  // localePrefix as-needed => strip /en or /es prefix if present
  const m = pathname.match(/^\/(en|es)(\/|$)/);
  if (m) {
    const stripped = pathname.slice(3);
    return stripped === "" ? "/" : stripped;
  }
  return pathname || "/";
}

function isActive(pathname: string, item: NavItem) {
  const norm = normalizePath(pathname);
  const target = item.match ?? item.href;
  if (norm === target) return true;
  // prefix match for grouped routes (e.g. /levels/* highlights Levels)
  if (target !== "/" && norm.startsWith(target + "/")) return true;
  return false;
}

export function AppSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop mobile */}
      <div
        aria-hidden={!mobileOpen}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Primary"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r bg-white transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-slate-900",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:shadow-none",
        )}
      >
        {/* Brand header */}
        <div className="flex h-[64px] shrink-0 items-center gap-3 border-b px-5 dark:border-slate-800">
          <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-extrabold tracking-tight shadow-sm">
            EL
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] leading-none font-semibold tracking-tight text-slate-900 dark:text-white">
              English
            </div>
            <div className="text-[11px] font-medium tracking-widest text-slate-500 dark:text-slate-400">
              LEARNING PLATFORM
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="hover:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-500 transition hover:text-slate-900 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          >
            <span aria-hidden className="text-[18px] leading-none">
              ×
            </span>
          </button>
          <span
            className="hidden h-2 w-2 rounded-full bg-emerald-500/90 ring-4 ring-emerald-500/10 lg:inline-flex"
            aria-hidden
          />
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 [scrollbar-width:thin] overflow-y-auto px-3 py-4">
          <nav className="space-y-6">
            {sections.map((section, idx) => (
              <div key={section.title}>
                {idx !== 0 && (
                  <div className="mb-6 border-t border-dashed dark:border-slate-800" aria-hidden />
                )}
                <div className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase dark:text-slate-500">
                  {section.title}
                </div>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-[9px] text-[13.5px] leading-none font-medium transition-all duration-150",
                            "border border-transparent",
                            active
                              ? "border-primary-200/60 bg-primary-50 text-primary-800 dark:border-primary-800/40 dark:bg-primary-950/40 dark:text-primary-200 shadow-[0_1px_0_0_rgba(0,0,0,0.02)]"
                              : "hover:bg-muted text-slate-600 hover:border-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-800/60 dark:hover:text-white",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                              active
                                ? "border-primary-200 text-primary-600 dark:border-primary-800 dark:text-primary-300 bg-white dark:bg-slate-900"
                                : "border-slate-200 bg-white text-slate-500 group-hover:border-slate-200 group-hover:text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400",
                            )}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                          {active && (
                            <span
                              className="bg-primary dark:bg-primary-300 ml-auto h-1.5 w-1.5 rounded-full"
                              aria-hidden
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* subtle footer card — progress hint */}
          <div className="from-primary-50 mt-8 rounded-2xl border bg-gradient-to-br to-white p-4 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-900">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-white">
              Keep going
            </div>
            <div className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
              Practice a bit daily. Your streak loves consistency.
            </div>
            <Link
              href="/reviews"
              onClick={onClose}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Review now <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="border-t p-3 dark:border-slate-800">
          <div className="bg-muted flex items-center gap-3 rounded-xl px-3 py-2.5 dark:bg-slate-800/60">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
              E
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                Learner
              </div>
              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                Level A1 · 3-day streak
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          </div>
        </div>
      </aside>
    </>
  );
}
