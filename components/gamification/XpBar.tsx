import { levelFromXp, xpForNextLevel } from "../../lib/gamification/xp";
export function XpBar({ xp }: { xp: number }) {
  const level = levelFromXp(xp);
  const next = xpForNextLevel(level);
  const prev = level > 1 ? xpForNextLevel(level - 1) : 0;
  const pct = Math.min(100, Math.round(((xp - prev) / (next - prev)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span>Level {level}</span><span>{xp} XP</span></div>
      <div className="h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
      <p className="text-xs text-gray-500">{next - xp} XP to next level</p>
    </div>
  );
}
