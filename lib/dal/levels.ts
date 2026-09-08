import { prisma } from "../db";

export async function getLevels() {
  return prisma.level.findMany({ orderBy: { orderIndex: "asc" } });
}
export async function getLevelByCode(code: string) {
  return prisma.level.findUnique({ where: { code: code as never }, include: { units: { orderBy: { orderIndex: "asc" } } } });
}
export async function getUnitsByLevel(levelId: string) {
  return prisma.unit.findMany({ where: { levelId }, orderBy: { orderIndex: "asc" } });
}
export async function getUnit(id: string) {
  return prisma.unit.findUnique({ where: { id }, include: { lessons: { orderBy: { orderIndex: "asc" } }, level: true } });
}
export async function getLesson(id: string) {
  return prisma.lesson.findUnique({ where: { id }, include: { exercises: true, unit: { include: { level: true } } } });
}
