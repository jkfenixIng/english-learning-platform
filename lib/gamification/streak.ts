export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null; // YYYY-MM-DD
  freezeCount: number;
}

export function updateStreak(prev: StreakData | null, todayStr: string): StreakData {
  if (!prev || !prev.lastActivityDate) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: todayStr,
      freezeCount: prev?.freezeCount ?? 0,
    };
  }
  if (prev.lastActivityDate === todayStr) return prev;
  const last = new Date(prev.lastActivityDate);
  const today = new Date(todayStr);
  const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) {
    const cur = prev.currentStreak + 1;
    return {
      currentStreak: cur,
      longestStreak: Math.max(prev.longestStreak, cur),
      lastActivityDate: todayStr,
      freezeCount: prev.freezeCount,
    };
  }
  // Streak Freeze: protege 1 día de olvido (gap ==2) consumiendo un freeze en vez de resetear
  if (diffDays === 2 && prev.freezeCount > 0) {
    return {
      currentStreak: prev.currentStreak,
      longestStreak: prev.longestStreak,
      lastActivityDate: todayStr,
      freezeCount: prev.freezeCount - 1,
    };
  }
  if (diffDays > 2 && prev.freezeCount > 0) {
    // Gaps >2 días superan la protección de 1 freeze: se consume uno si hay pero igual se resetea racha (no se regala)
    return {
      currentStreak: 1,
      longestStreak: prev.longestStreak,
      lastActivityDate: todayStr,
      freezeCount: prev.freezeCount - 1,
    };
  }
  return {
    currentStreak: 1,
    longestStreak: prev.longestStreak,
    lastActivityDate: todayStr,
    freezeCount: prev.freezeCount,
  };
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
