"use client";
import { useTranslations } from "next-intl";
export function StreakIndicator({ streak }: { streak: number }) {
  const t = useTranslations("gamification");
  // Use single key that handles plural via ICU would be ideal, but we use conditional
  const label =
    streak === 1 ? t("dayStreak", { count: streak }) : t("daysStreak", { count: streak });
  return (
    <div className="flex items-center gap-1 text-sm font-semibold">
      <span>🔥</span>
      <span>{label}</span>
    </div>
  );
}
