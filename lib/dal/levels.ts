import { prisma } from "../db";
import { getCurriculumMode } from "../curriculum/config";

export async function getLevels() {
  return prisma.level.findMany({ orderBy: { orderIndex: "asc" } });
}
export async function getLevelByCode(code: string) {
  return prisma.level.findUnique({
    where: { code: code as never },
    include: { units: { orderBy: { orderIndex: "asc" } } },
  });
}
export async function getUnitsByLevel(levelId: string) {
  return prisma.unit.findMany({
    where: { levelId },
    orderBy: { orderIndex: "asc" },
  });
}
export async function getUnit(id: string) {
  return prisma.unit.findUnique({
    where: { id },
    include: { lessons: { orderBy: { orderIndex: "asc" } }, level: true },
  });
}
export async function getLesson(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: { exercises: true, unit: { include: { level: true } } },
  });
}

// --- PRD strict Module alias (Unit -> Module) ---

export type UnitDTO = {
  id: string;
  levelId: string;
  title: string;
  description: string;
  orderIndex: number;
  coverImage: string | null;
  moduleId: string;
  /** @deprecated Use moduleId — kept for one release compat */
  unit: string;
};

export type LessonModuleDTO = {
  moduleId: string;
  /** @deprecated Use moduleId */
  unitId: string;
  /** @deprecated Use moduleId */
  unit: string;
};

export function toUnitDTO(unit: {
  id: string;
  levelId: string;
  title: string;
  description: string;
  orderIndex: number;
  coverImage: string | null;
}): UnitDTO {
  return {
    ...unit,
    moduleId: unit.id,
    unit: unit.id,
  };
}

export function toLessonModuleDTO(lesson: { unitId: string }): LessonModuleDTO {
  return {
    moduleId: lesson.unitId,
    unitId: lesson.unitId,
    unit: lesson.unitId,
  };
}

export function getCurriculumMeta() {
  return { mode: getCurriculumMode() };
}
