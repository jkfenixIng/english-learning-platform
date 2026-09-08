export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null; // YYYY-MM-DD
  freezeCount: number;
}

export function updateStreak(prev: StreakData | null, todayStr: string): StreakData {
  if (!prev || !prev.lastActivityDate) {
    return { currentStreak: 1, longestStreak: 1, lastActivityDate: todayStr, freezeCount: prev?.freezeCount ?? 0 };
  }
  if (prev.lastActivityDate === todayStr) return prev;
  const last = new Date(prev.lastActivityDate);
  const today = new Date(todayStr);
  const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) {
    const cur = prev.currentStreak + 1;
    return { currentStreak: cur, longestStreak: Math.max(prev.longestStreak, cur), lastActivityDate: todayStr, freezeCount: prev.freezeCount };
  }
  if (diffDays > 1 && prev.freezeCount > 0) {
    return { currentStreak: prev.currentStreak, longestStreak: prev.longestStreak, lastActivityDate: todayStr, freezeCount: prev.freezeCount - 1 };
  }
  return { currentStreak: 1, longestStreak: prev.longestStreak, lastActivityDate: todayStr, freezeCount: prev.freezeCount };
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
