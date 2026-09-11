import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { generateEvaluations } from "../lib/curriculum/evaluationGenerator";
import {
  EvaluationSchema,
  assertEvaluationDistribution,
  CurriculumErrorCode,
} from "../lib/curriculum/schemas";
import { imageRefRegex } from "../lib/curriculum/schemas";

function hashOf(o: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);
}

describe("evaluationGenerator 15Q 4/6/5", () => {
  it("seed 42 produces 24 evaluations each 15Q 4/6/5 deterministic hash-stable", () => {
    const e1 = generateEvaluations(42);
    const e2 = generateEvaluations(42);
    expect(e1).toHaveLength(24);
    expect(hashOf(e1)).toBe(hashOf(e2));
    for (const ev of e1) {
      expect(ev.questions).toHaveLength(15);
      expect(EvaluationSchema.safeParse(ev).success).toBe(true);
      const c = { reading: 0, grammar_vocab: 0, listening: 0 };
      for (const q of ev.questions) c[q.category as keyof typeof c]++;
      expect(c.reading).toBe(4);
      expect(c.grammar_vocab).toBe(6);
      expect(c.listening).toBe(5);
      expect(() => assertEvaluationDistribution(ev.questions)).not.toThrow();
    }
    const ids = e1.map((e) => e.moduleId);
    expect(new Set(ids).size).toBe(24);
    expect(ids).toContain("a1_m1");
    expect(ids).toContain("c2_m4");
  });
  it("reading types are comprehension/graded_reading, grammar fill_blanks/matching/transformation/multiple_choice, listening tts/dictation/shadowing/pronunciation", () => {
    const evals = generateEvaluations(42);
    for (const ev of evals) {
      for (const q of ev.questions) {
        if (q.category === "reading") expect(["comprehension", "graded_reading"]).toContain(q.type);
        if (q.category === "grammar_vocab")
          expect(["fill_blanks", "matching", "transformation", "multiple_choice"]).toContain(
            q.type,
          );
        if (q.category === "listening")
          expect(["listening_tts", "dictation", "shadowing", "pronunciation"]).toContain(q.type);
        if (q.image_ref) expect(imageRefRegex.test(q.image_ref)).toBe(true);
      }
    }
  });
  it("distribution drift 5/5/5 fails", () => {
    const bad = Array.from({ length: 15 }, (_, i) => ({
      id: `q${i}`,
      category: i < 5 ? "reading" : i < 10 ? "grammar_vocab" : "listening",
      type: "comprehension",
      prompt: "x",
    }));
    expect(() => assertEvaluationDistribution(bad as any)).toThrow(
      CurriculumErrorCode.EVALUATION_DISTRIBUTION_MISMATCH,
    );
    expect(EvaluationSchema.safeParse({ moduleId: "a1_m1", questions: bad }).success).toBe(false);
  });
  it("different seed diverges but counts stable", () => {
    const a = generateEvaluations(42);
    const b = generateEvaluations(99);
    expect(a).toHaveLength(24);
    expect(b).toHaveLength(24);
    expect(hashOf(a)).not.toBe(hashOf(b));
  });
});
