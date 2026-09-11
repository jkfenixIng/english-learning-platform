#!/usr/bin/env tsx
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { generateLessons } from "../lib/curriculum/lessonGenerator.js";
import { generateQuizzes } from "../lib/curriculum/quizGenerator.js";
import { LessonSchema, QuizSchema, assertCurriculumCounts } from "../lib/curriculum/schemas.js";

function parseArgs() {
  const a = process.argv.slice(2);
  if (a.includes("--help") || a.includes("-h")) {
    console.log(
      `Usage: pnpm curriculum:generate [--mode prd_strict|legacy] [--seed 42] [--dry-run] [--out file.json]`,
    );
    process.exit(0);
  }
  const mi = a.indexOf("--mode");
  const si = a.indexOf("--seed");
  const oi = a.indexOf("--out");
  const mode = mi !== -1 ? a[mi + 1] : (process.env.CURRICULUM_MODE ?? "legacy");
  const seedRaw = si !== -1 ? a[si + 1] : process.env.CURRICULUM_SEED;
  const seed = seedRaw !== undefined ? Number(seedRaw) : 42;
  const dryRun = a.includes("--dry-run");
  const out = oi !== -1 ? a[oi + 1] : undefined;
  return { mode, seed, dryRun, out };
}

const { mode, seed, dryRun, out } = parseArgs();

if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31) {
  console.error(`INVALID_SEED ${seed}`);
  process.exit(1);
}

if (mode !== "legacy" && mode !== "prd_strict") {
  console.error(`Invalid mode ${mode}`);
  process.exit(1);
}

if (mode === "legacy") {
  console.log(
    `[curriculum:generate] mode=legacy — use prd_strict for 72/72. Dry-run counts via legacy seed would be 188.`,
  );
  if (!dryRun) console.log(`[curriculum:generate] legacy generation skipped (no prd invariants)`);
  process.exit(0);
}

const lessons = generateLessons(seed);
const quizzes = generateQuizzes(lessons, seed);

// Zod validation
let zodErrors = 0;
for (const l of lessons) {
  const r = LessonSchema.safeParse(l);
  if (!r.success) {
    zodErrors++;
    console.error(`[validate] lesson ${l.id_leccion} failed`, r.error.issues[0]?.message);
  }
}
for (const q of quizzes) {
  const r = QuizSchema.safeParse(q);
  if (!r.success) {
    zodErrors++;
    console.error(`[validate] quiz ${q.lessonId} failed`, r.error.issues[0]?.message);
  }
}
if (zodErrors) {
  console.error(`[curriculum:generate] validation failed ${zodErrors} errors`);
  process.exit(1);
}

// counts guard
try {
  assertCurriculumCounts({ lessons: lessons.length, quizzes: quizzes.length, evaluations: 24 });
} catch (e) {
  // PR4 only has lessons/quizzes, evaluations are 0 until PR5 — so check 72/72 only
  if (lessons.length !== 72 || quizzes.length !== 72) {
    console.error(String(e));
    console.error(
      `[curriculum:generate] counts lessons=${lessons.length} quizzes=${quizzes.length} expected 72/72`,
    );
    process.exit(1);
  }
}
if (lessons.length !== 72 || quizzes.length !== 72) {
  console.error(`CURRICULUM_COUNT_MISMATCH lessons=${lessons.length} quizzes=${quizzes.length}`);
  process.exit(1);
}
// quiz 5Q guard
for (const q of quizzes)
  if (q.questions.length !== 5) {
    console.error(`quiz ${q.lessonId} has ${q.questions.length} not 5`);
    process.exit(1);
  }

// hash stable
const payload = JSON.stringify({ lessons, quizzes });
const hash = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
console.log(
  `[curriculum:generate] mode=${mode} seed=${seed} lessons=${lessons.length} quizzes=${quizzes.length} hash=${hash} zod=ok`,
);

// optional out
if (out) {
  const dir = path.dirname(path.resolve(out));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.resolve(out),
    JSON.stringify({ lessons, quizzes, hash, seed, mode }, null, 2),
  );
  console.log(`[curriculum:generate] wrote ${out}`);
}
if (dryRun) console.log(`[curriculum:generate] dry-run — no DB write`);
process.exit(0);
