import { cn } from "@/lib/utils/cn";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800",
        "border border-transparent dark:border-slate-800/50",
        className,
      )}
    />
  );
}

export function LevelCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-36 animate-pulse bg-slate-100 dark:bg-slate-800" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-7 w-28 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
