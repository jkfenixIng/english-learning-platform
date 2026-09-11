#!/usr/bin/env tsx
/**
 * migrate-progress — PR6 6.2 Legacy progress migration mapping
 *
 * Maps legacy 188-lesson completion (6 levels x6 units x5 lessons + exams)
 * to PRD strict 72 lessons (6x4x3) + 24 evaluations (orderIndex 4 per module).
 *
 * Rules:
 * - Keep: levels A1-C2, units 1-4, lessons 1-3 (72 teach).
 * - Prune: units 5,6 and lesson 4,5 in every retained unit -> archived.
 * - Exams: legacy orderIndex 99 (and 2 for C) -> prd orderIndex 4 per module.
 *          legacy exam progress is carried to the new per-module evaluation of the
 *          same level (first module's evaluation) or marked orphan for manual review.
 * - Completion: if any pruned lesson was completed, surface as `orphan` for
 *              product to decide (carryover credit, extra XP, or ignore).
 *
 * Usage:
 *   pnpm tsx scripts/migrate-progress.ts --dry-run
 *   pnpm tsx scripts/migrate-progress.ts --user <uuid>  (requires DATABASE_URL)
 *
 * This script is dry-run by default and never writes without --apply.
 */
type MappingOutcome = "mapped" | "pruned_unit" | "pruned_lesson" | "exam_orphan";

export interface LegacyLessonKey {
  level: string; // A1
  unit: number; // 1..6
  lesson: number; // 1..5
}
export interface PrdLessonKey {
  id_leccion: string; // a1_m1_l1
  level: string;
  module: number;
  lesson: number;
}

export function legacyLessonToPrd(key: LegacyLessonKey): {
  mapped: PrdLessonKey | null;
  outcome: MappingOutcome;
} {
  const lvlLower = key.level.toLowerCase();
  if (key.unit > 4) return { mapped: null, outcome: "pruned_unit" };
  if (key.lesson > 3) return { mapped: null, outcome: "pruned_lesson" };
  const id = `${lvlLower}_m${key.unit}_l${key.lesson}`;
  return {
    mapped: { id_leccion: id, level: lvlLower, module: key.unit, lesson: key.lesson },
    outcome: "mapped",
  };
}

export function legacyExamToPrd(level: string): {
  moduleId: string;
  orderIndex: number;
  note: string;
} {
  // Legacy exam was one per level (orderIndex 99). In PRD we have 4 per level.
  // Carry completion to a1_m1 evaluation as representative; UI can show "legacy exam credit".
  const lvlLower = level.toLowerCase();
  return {
    moduleId: `${lvlLower}_m1`,
    orderIndex: 4,
    note: "legacy level exam -> prd module m1 evaluation (orderIndex 4)",
  };
}

function parseArgs() {
  const a = process.argv.slice(2);
  if (a.includes("--help") || a.includes("-h")) {
    console.log(
      `Usage: pnpm tsx scripts/migrate-progress.ts [--dry-run] [--apply] [--user <id>]\n` +
        `  --dry-run  print mapping table (default)\n` +
        `  --apply    perform DB migration (requires DATABASE_URL)\n`,
    );
    process.exit(0);
  }
  const dryRun = !a.includes("--apply");
  const userIdx = a.indexOf("--user");
  const userId = userIdx !== -1 ? a[userIdx + 1] : undefined;
  return { dryRun, userId };
}

async function main() {
  const { dryRun, userId: _userId } = parseArgs();
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
  let mapped = 0,
    prunedUnit = 0,
    prunedLesson = 0;
  const rows: string[] = [];
  for (const lvl of levels) {
    for (let u = 1; u <= 6; u++) {
      for (let l = 1; l <= 5; l++) {
        const { mapped: m, outcome } = legacyLessonToPrd({ level: lvl, unit: u, lesson: l });
        if (outcome === "mapped") mapped++;
        else if (outcome === "pruned_unit") prunedUnit++;
        else prunedLesson++;
        if (u <= 2 && l <= 2) rows.push(`${lvl}-u${u}-l${l} -> ${m ? m.id_leccion : outcome}`);
      }
    }
  }
  const legacyExams = 8; // 6 finals@99 + 2 C part2
  console.log(
    `[migrate-progress] dryRun=${dryRun} mapped=${mapped} pruned_unit=${prunedUnit} pruned_lesson=${prunedLesson} teachLegacy=${mapped + prunedUnit + prunedLesson} examsLegacy=${legacyExams} totalLegacy=${mapped + prunedUnit + prunedLesson + legacyExams} (188)`,
  );
  console.log(`[migrate-progress] PRD strict 72 teach + 24 evaluations (orderIndex 4 per module)`);
  console.log(`Examples (first 2 units x2 lessons per level):`);
  for (const r of rows) console.log(`  ${r}`);
  console.log(`Exam mapping:`);
  for (const lvl of levels) {
    const e = legacyExamToPrd(lvl);
    console.log(`  ${lvl} exam@99 -> ${e.moduleId} orderIndex=${e.orderIndex} (${e.note})`);
  }
  console.log(
    `Orphan strategy: pruned lessons with progress -> log to docs/curriculum-rollout.md migration notes; no automatic credit (opt-in via --apply with mapping table).`,
  );
  if (!dryRun) {
    console.log(
      `[migrate-progress] --apply requested but DB wiring is opt-in — implement per UserProgress table when DATABASE_URL present.`,
    );
  }
}

const isMain = process.argv[1]?.replace(/\\/g, "/").includes("migrate-progress");
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
