export type ChallengeType = "daily" | "weekly" | "timed" | "streak" | "competitive";

export interface ChallengeRule {
  metric?: "exercises" | "xp" | "streak" | "lessons";
  count?: number;
  targetXp?: number;
  streakDays?: number;
  [k: string]: unknown;
}

export interface ParticipantProgress {
  current?: number;
  target?: number;
  completed?: boolean;
}

export function isChallengeActive(startAt: Date, endAt: Date, now = new Date()): boolean {
  return now >= startAt && now <= endAt;
}

export function progressForRule(rule: ChallengeRule, stats: { exercises?: number; xp?: number; streak?: number; lessons?: number }): ParticipantProgress {
  const metricVal = rule.metric === "xp" ? (stats.xp ?? 0) : rule.metric === "streak" ? (stats.streak ?? 0) : rule.metric === "lessons" ? (stats.lessons ?? 0) : (stats.exercises ?? 0);
  const target = rule.count ?? rule.targetXp ?? rule.streakDays ?? 5;
  return { current: Math.min(metricVal, target), target, completed: metricVal >= target };
}

export function isExpired(endAt: Date, now = new Date()): boolean {
  return now > endAt;
}

export function defaultChallengeWindows(type: ChallengeType, now = new Date()): { startAt: Date; endAt: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (type === "daily") end.setDate(end.getDate() + 1), end.setMilliseconds(-1);
  else if (type === "weekly") { const day = start.getDay(); const mondayOffset = (day === 0 ? -6 : 1 - day); start.setDate(start.getDate() + mondayOffset); end.setTime(start.getTime()); end.setDate(end.getDate() + 7); end.setMilliseconds(-1); }
  else if (type === "timed") end.setHours(23, 59, 59, 999);
  else if (type === "streak") end.setDate(end.getDate() + 7), end.setMilliseconds(-1);
  else if (type === "competitive") end.setDate(end.getDate() + 7), end.setMilliseconds(-1);
  return { startAt: start, endAt: end };
}
