import { prisma } from "../db";
import { review, createInitialCard } from "./sm2";

export async function getDueCards(userId: string, todayISO: string, opts?: { topicUnitId?: string; limit?: number }) {
  const where: Record<string, unknown> = { userId, dueDate: { lte: new Date(todayISO) } };
  const cards = await prisma.srsCard.findMany({ where: where as never, orderBy: { dueDate: "asc" }, take: opts?.limit ?? 50, include: { exercise: { include: { lesson: true } } } });
  if (opts?.topicUnitId) return cards.filter((c) => (c.exercise as unknown as { lesson: { unitId: string } }).lesson.unitId === opts.topicUnitId);
  return cards;
}

export async function ensureCard(userId: string, exerciseId: string, todayISO: string) {
  const existing = await prisma.srsCard.findUnique({ where: { userId_exerciseId: { userId, exerciseId } as never } });
  if (existing) return existing;
  return prisma.srsCard.create({ data: { id: crypto.randomUUID(), userId, exerciseId, dueDate: new Date(todayISO), interval: 0, easeFactor: 2.5, repetitions: 0, lapses: 0 } as never });
}

export async function reviewCard(cardId: string, quality: number, todayISO: string) {
  const card = await prisma.srsCard.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("Card not found");
  const next = review({ interval: card.interval, easeFactor: card.easeFactor, repetitions: card.repetitions, dueDate: card.dueDate.toISOString().slice(0,10), lapses: card.lapses }, quality, todayISO);
  const updated = await prisma.srsCard.update({ where: { id: cardId }, data: { interval: next.interval, easeFactor: next.easeFactor, repetitions: next.repetitions, dueDate: new Date(next.dueDate), lapses: next.lapses } as never });
  await prisma.srsReview.create({ data: { id: crypto.randomUUID(), cardId, quality } as never });
  return updated;
}

export function shouldAutoCreate(exerciseType: string, score: number): boolean {
  const autoTypes = ["flashcard", "matching"];
  if (autoTypes.includes(exerciseType)) return true;
  return score < 70;
}
