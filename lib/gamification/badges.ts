export interface BadgeRuleData {
  code: string;
  rule?: { type: string; gte?: number; lte?: number; equals?: string };
}

export function evaluateBadge(rule: BadgeRuleData["rule"], stats: { streak?: number; xp?: number; levelPassed?: string; lessonsCompleted?: number }): boolean {
  if (!rule) return false;
  if (rule.type === "streak" && stats.streak !== undefined) return stats.streak >= (rule.gte ?? 0);
  if (rule.type === "xp" && stats.xp !== undefined) return stats.xp >= (rule.gte ?? 0);
  if (rule.type === "level_pass" && stats.levelPassed) return stats.levelPassed === rule.equals;
  if (rule.type === "lessons_completed" && stats.lessonsCompleted !== undefined) return stats.lessonsCompleted >= (rule.gte ?? 0);
  return false;
}

export const BADGE_DEFINITIONS: BadgeRuleData[] = [
  { code: "first_lesson", rule: { type: "lessons_completed", gte: 1 } },
  { code: "streak_3", rule: { type: "streak", gte: 3 } },
  { code: "streak_7", rule: { type: "streak", gte: 7 } },
  { code: "a1_complete", rule: { type: "level_pass", equals: "A1" } },
  { code: "a2_complete", rule: { type: "level_pass", equals: "A2" } },
  { code: "xp_100", rule: { type: "xp", gte: 100 } },
  { code: "xp_500", rule: { type: "xp", gte: 500 } },
  { code: "ten_lessons", rule: { type: "lessons_completed", gte: 10 } },
];
