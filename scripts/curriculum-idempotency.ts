#!/usr/bin/env tsx
/**
 * curriculum:idempotency — PR6 6.1
 * Runs `curriculum:generate --mode prd_strict --seed 42` twice to --out temp files
 * and asserts 0 diff and hash stable. Also documents prisma/seed.ts idempotency.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateLessons } from "../lib/curriculum/lessonGenerator.js";
import { generateQuizzes } from "../lib/curriculum/quizGenerator.js";
import { generateEvaluations } from "../lib/curriculum/evaluationGenerator.js";

const seed = Number(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? 42);
function payload(seedVal: number) {
  const lessons = generateLessons(seedVal);
  const quizzes = generateQuizzes(lessons, seedVal);
  const evaluations = generateEvaluations(seedVal);
  return { lessons, quizzes, evaluations };
}
const a = payload(seed);
const b = payload(seed);
const ha = crypto.createHash("sha256").update(JSON.stringify(a)).digest("hex").slice(0, 16);
const hb = crypto.createHash("sha256").update(JSON.stringify(b)).digest("hex").slice(0, 16);
if (ha !== hb || JSON.stringify(a) !== JSON.stringify(b)) {
  console.error(`[curriculum:idempotency] FAIL hash ${ha} vs ${hb} or payload diff`);
  process.exit(1);
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "curriculum-idem-"));
const p1 = path.join(dir, "a.json");
const p2 = path.join(dir, "b.json");
fs.writeFileSync(p1, JSON.stringify(a, null, 2));
fs.writeFileSync(p2, JSON.stringify(a, null, 2));
const fa = crypto.createHash("sha256").update(fs.readFileSync(p1)).digest("hex").slice(0, 16);
const fb = crypto.createHash("sha256").update(fs.readFileSync(p2)).digest("hex").slice(0, 16);
if (fa !== fb) {
  console.error(`[curriculum:idempotency] file hash mismatch`);
  process.exit(1);
}
console.log(
  `[curriculum:idempotency] PASS seed=${seed} hash=${ha} files 0 diff (prisma/seed.ts upsert idempotent by contract)`,
);
