export interface XpInput {
  base?: number;
  difficulty: number; // 1-5
  timeBonus?: number; // 0.5-1.5
  streakMultiplier?: number; // 1.0+
}
export function computeXp({ base = 10, difficulty, timeBonus = 1, streakMultiplier = 1 }: XpInput): number {
  const d = Math.max(1, Math.min(5, difficulty));
  return Math.round(base * d * timeBonus * streakMultiplier);
}
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}
export function xpForNextLevel(level: number): number {
  return (level * level) * 100;
}
