#!/usr/bin/env tsx
import crypto from "node:crypto";
import { generateLessons } from "../lib/curriculum/lessonGenerator.js";
import { generateQuizzes } from "../lib/curriculum/quizGenerator.js";
import { generateEvaluations } from "../lib/curriculum/evaluationGenerator.js";
import { EvaluationSchema, assertCurriculumCounts } from "../lib/curriculum/schemas.js";

function parseArgs() {
  const a = process.argv.slice(2);
  if (a.includes("--help") || a.includes("-h")) {
    console.log(`Usage: pnpm curriculum:audit [--mode prd_strict|legacy] [--seed 42]`);
    process.exit(0);
  }
  const mi = a.indexOf("--mode");
  const si = a.indexOf("--seed");
  const mode = mi !== -1 ? a[mi + 1] : (process.env.CURRICULUM_MODE ?? "prd_strict");
  const seed = si !== -1 ? Number(a[si + 1]) : Number(process.env.CURRICULUM_SEED ?? 42);
  return { mode, seed };
}
const { mode, seed } = parseArgs();
if (mode !== "legacy" && mode !== "prd_strict") {
  console.error(`Invalid mode ${mode}`);
  process.exit(1);
}
if (mode === "legacy") {
  console.log(
    `[curriculum:audit] mode=legacy — PRD invariants not enforced (expected 188 lessons)`,
  );
  process.exit(0);
}
const lessons = generateLessons(seed);
const quizzes = generateQuizzes(lessons, seed);
const evaluations = generateEvaluations(seed);

try {
  assertCurriculumCounts({
    lessons: lessons.length,
    quizzes: quizzes.length,
    evaluations: evaluations.length,
  });
} catch (e) {
  console.error(String(e));
  process.exit(1);
}
let errors = 0;
const totals = { reading: 0, grammar_vocab: 0, listening: 0, images: 0 };
console.log(`[curriculum:audit] mode=${mode} seed=${seed}`);
console.log(
  `counts lessons=${lessons.length} quizzes=${quizzes.length} evaluations=${evaluations.length}`,
);
console.log(`per-evaluation breakdown (expected 4/6/5 each 15Q):`);
for (const ev of evaluations) {
  const r = EvaluationSchema.safeParse(ev);
  if (!r.success) {
    console.error(`  ✗ ${ev.moduleId} schema fail ${r.error.issues[0]?.message}`);
    errors++;
    continue;
  }
  const c = { reading: 0, grammar_vocab: 0, listening: 0 };
  let img = 0;
  for (const q of ev.questions) {
    c[q.category as keyof typeof c]++;
    if ((q as unknown as { image_ref?: string }).image_ref) img++;
  }
  totals.reading += c.reading;
  totals.grammar_vocab += c.grammar_vocab;
  totals.listening += c.listening;
  totals.images += img;
  const ok =
    c.reading === 4 && c.grammar_vocab === 6 && c.listening === 5 && ev.questions.length === 15;
  const mark = ok ? "✓" : "✗";
  console.log(
    `  ${mark} ${ev.moduleId} ${c.reading}/${c.grammar_vocab}/${c.listening} images=${img} ${ok ? "" : "MISMATCH"}`,
  );
  if (!ok) errors++;
}
console.log(
  `totals evaluations=${evaluations.length} reading=${totals.reading} grammar_vocab=${totals.grammar_vocab} listening=${totals.listening} image_refs=${totals.images}`,
);
const hash = crypto
  .createHash("sha256")
  .update(JSON.stringify({ lessons, quizzes, evaluations }))
  .digest("hex")
  .slice(0, 16);
console.log(`hash=${hash} seed=${seed}`);
if (errors) {
  console.error(`[curriculum:audit] FAILED ${errors} distribution errors`);
  process.exit(1);
}
console.log(`[curriculum:audit] PASS — all 24 evaluations 15Q 4/6/5, 72/72/24 counts`);
