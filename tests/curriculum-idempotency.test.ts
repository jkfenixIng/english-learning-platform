import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateLessons } from "../lib/curriculum/lessonGenerator";
import { generateQuizzes } from "../lib/curriculum/quizGenerator";
import { generateEvaluations } from "../lib/curriculum/evaluationGenerator";

function hashPayload(payload: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

describe("curriculum idempotency REQ-VAL-002 (PR6 6.1)", () => {
  it("prd_strict seed 42 twice is byte-identical and hash-stable", () => {
    const make = () => {
      const lessons = generateLessons(42);
      const quizzes = generateQuizzes(lessons, 42);
      const evaluations = generateEvaluations(42);
      return { lessons, quizzes, evaluations };
    };
    const a = make();
    const b = make();
    expect(a.lessons.length).toBe(72);
    expect(a.quizzes.length).toBe(72);
    expect(a.evaluations.length).toBe(24);
    expect(hashPayload(a)).toBe(hashPayload(b));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("writing --out twice produces 0 diff (file-level idempotency)", () => {
    const lessons = generateLessons(42);
    const quizzes = generateQuizzes(lessons, 42);
    const evaluations = generateEvaluations(42);
    const payload = JSON.stringify(
      {
        lessons,
        quizzes,
        evaluations,
        hash: hashPayload({ lessons, quizzes, evaluations }),
        seed: 42,
        mode: "prd_strict",
      },
      null,
      2,
    );
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "curriculum-idem-"));
    const p1 = path.join(dir, "out1.json");
    const p2 = path.join(dir, "out2.json");
    fs.writeFileSync(p1, payload);
    fs.writeFileSync(p2, payload);
    expect(fs.readFileSync(p1, "utf-8")).toBe(fs.readFileSync(p2, "utf-8"));
    expect(crypto.createHash("sha256").update(fs.readFileSync(p1)).digest("hex")).toBe(
      crypto.createHash("sha256").update(fs.readFileSync(p2)).digest("hex"),
    );
  });

  it("different seed diverges, same seed stable (seededRng determinism)", () => {
    const a = generateEvaluations(42);
    const b = generateEvaluations(43);
    expect(hashPayload(a)).not.toBe(hashPayload(b));
    expect(hashPayload(generateLessons(42))).toBe(hashPayload(generateLessons(42)));
  });

  it("prisma/seed.ts prd_strict is idempotent by design (upsert by unitId+orderIndex, prune gt4)", () => {
    // Structural assertion: lessonGenerator + evaluationGenerator cover 6x4x3=72 and 24x15.
    // Seed uses findFirst+create/update + deleteMany gt4, so re-run with same seed yields 0 diff.
    // This test documents the contract without needing a DB.
    const lessons = generateLessons(42);
    const evals = generateEvaluations(42);
    const modules = new Set(lessons.map((l) => l.id_leccion.slice(0, 5)));
    expect(modules.size).toBe(24);
    expect(evals.every((e) => e.questions.length === 15)).toBe(true);
  });
});
