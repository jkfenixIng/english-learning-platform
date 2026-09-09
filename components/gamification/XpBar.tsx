"use client";
import { useTranslations } from "next-intl";
import { levelFromXp, xpForNextLevel } from "../../lib/gamification/xp";
export function XpBar({ xp }: { xp: number }) {
  const t = useTranslations("gamification");
  const level = levelFromXp(xp);
  const next = xpForNextLevel(level);
  const prev = level > 1 ? xpForNextLevel(level - 1) : 0;
  const pct = Math.min(100, Math.round(((xp - prev) / (next - prev)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{t("levelLabel", { level })}</span>
        <span>{t("xpLabel", { xp })}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200">
        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-500">{t("xpToNext", { remaining: next - xp })}</p>
    </div>
  );
}
