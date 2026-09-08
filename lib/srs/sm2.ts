export interface SrsCardState {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: string; // YYYY-MM-DD
  lapses: number;
}

export function createInitialCard(todayISO: string): SrsCardState {
  return { interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: todayISO, lapses: 0 };
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function review(card: SrsCardState, quality: number, todayISO: string): SrsCardState {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new Error("quality must be integer 0-5");
  }
  let { interval, easeFactor, repetitions, lapses } = card;
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
    lapses += 1;
  }
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const dueDate = addDays(todayISO, interval);
  return { interval, easeFactor, repetitions, dueDate, lapses };
}

export function isDue(card: SrsCardState, todayISO: string): boolean {
  return card.dueDate <= todayISO;
}

export function qualityFromScore(score: number): number {
  if (score >= 95) return 5;
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 30) return 2;
  if (score > 0) return 1;
  return 0;
}
