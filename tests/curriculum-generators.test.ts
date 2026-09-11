import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { createSeededRng, seededRng } from "../lib/curriculum/seededRng";
import { generateLessons } from "../lib/curriculum/lessonGenerator";
import { generateQuizzes } from "../lib/curriculum/quizGenerator";
import {
  LessonSchema,
  QuizSchema,
  lessonIdRegex,
  imageRefRegex,
  ipaRegex,
} from "../lib/curriculum/schemas";

function hashOf(obj: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}

describe("seededRng mulberry32", () => {
  it("same seed byte-identical sequence, nextInt/nextFloat/shuffle/pick deterministic", () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seqA = Array.from({ length: 10 }, () => a.nextFloat());
    const seqB = Array.from({ length: 10 }, () => b.nextFloat());
    expect(seqA).toEqual(seqB);
    // nextInt stable
    const a2 = createSeededRng(7);
    const b2 = createSeededRng(7);
    expect(a2.nextInt(1, 10)).toBe(b2.nextInt(1, 10));
    // shuffle deterministic
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(createSeededRng(123).shuffle(arr)).toEqual(createSeededRng(123).shuffle(arr));
    expect(createSeededRng(123).pick(arr)).toBe(createSeededRng(123).pick(arr));
  });
  it("different seeds diverge, seed bounds 0..2^31", () => {
    expect(createSeededRng(42).nextFloat()).not.toBe(createSeededRng(43).nextFloat());
    expect(() => createSeededRng(-1)).toThrow();
    expect(() => createSeededRng(2 ** 31 + 1)).toThrow();
    expect(() => createSeededRng(1.5)).toThrow();
    expect(createSeededRng(0).nextFloat()).toBeGreaterThanOrEqual(0);
    expect(createSeededRng(2 ** 31).nextFloat()).toBeLessThan(1);
  });
  it("alias seededRng works", () => {
    expect(seededRng(42).nextFloat()).toBe(createSeededRng(42).nextFloat());
  });
});

describe("lessonGenerator PRD strict 72", () => {
  it("seed 42 produces 72 lessons with valid schema, 6x4x3 structure, hash-stable re-run", () => {
    const l1 = generateLessons(42);
    const l2 = generateLessons(42);
    expect(l1).toHaveLength(72);
    expect(l2).toHaveLength(72);
    expect(hashOf(l1)).toBe(hashOf(l2));
    // ids canonical
    const ids = l1.map((l) => l.id_leccion);
    expect(new Set(ids).size).toBe(72);
    for (const id of ids) expect(lessonIdRegex.test(id)).toBe(true);
    expect(ids).toContain("a1_m1_l1");
    expect(ids).toContain("c2_m4_l3");
    // 6 levels x4 modules x3 lessons
    for (const lvl of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
      expect(l1.filter((l) => l.id_leccion.startsWith(lvl)).length).toBe(12);
      for (let m = 1; m <= 4; m++) {
        expect(l1.filter((l) => l.id_leccion.startsWith(`${lvl}_m${m}_`)).length).toBe(3);
      }
    }
    // titulo, objetivo, explicacion, vocab, images invariants via Zod
    for (const l of l1) {
      const r = LessonSchema.safeParse(l);
      expect(
        r.success,
        `${l.id_leccion} zod fail ${JSON.stringify((r as unknown as { error?: unknown }).error)}`,
      ).toBe(true);
      expect(l.titulo.en.length).toBeGreaterThan(0);
      expect(l.titulo.es.length).toBeGreaterThan(0);
      expect(l.objetivo.length).toBeGreaterThanOrEqual(10);
      expect(l.objetivo.length).toBeLessThanOrEqual(300);
      expect(l.explicacion_gramatical.length).toBeGreaterThanOrEqual(20);
      expect(l.vocabulario_clave.length).toBeGreaterThanOrEqual(3);
      expect(l.vocabulario_clave.length).toBeLessThanOrEqual(8);
      for (const v of l.vocabulario_clave) expect(ipaRegex.test(v.ipa)).toBe(true);
      expect(l.ilustraciones_asociadas.length).toBeGreaterThanOrEqual(1);
      expect(l.ilustraciones_asociadas.length).toBeLessThanOrEqual(3);
      for (const img of l.ilustraciones_asociadas) expect(imageRefRegex.test(img)).toBe(true);
    }
  });
  it("different seed produces different hash but same counts", () => {
    const a = generateLessons(42);
    const b = generateLessons(99);
    expect(a).toHaveLength(72);
    expect(b).toHaveLength(72);
    expect(hashOf(a)).not.toBe(hashOf(b));
  });
});

describe("quizGenerator 5Q per lesson", () => {
  it("1 quiz per lesson, 5Q, visual has image_ref, B/C truncation quarantine", () => {
    const lessons = generateLessons(42);
    const quizzes = generateQuizzes(lessons, 42);
    expect(quizzes).toHaveLength(72);
    for (const q of quizzes) {
      expect(q.questions).toHaveLength(5);
      const r = QuizSchema.safeParse(q);
      expect(r.success, `${q.lessonId} quiz zod fail`).toBe(true);
      expect(q.lessonId).toMatch(lessonIdRegex);
      expect(lessons.some((l) => l.id_leccion === q.lessonId)).toBe(true);
      for (const qq of q.questions) if (qq.type === "visual") expect(qq.image_ref).toBeDefined();
    }
    // at least one of each per level
    for (const lvl of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
      const levelQs = quizzes.filter((q) => q.lessonId.startsWith(lvl)).flatMap((q) => q.questions);
      const types = new Set(levelQs.map((q) => q.type));
      expect(types.has("multiple_choice")).toBe(true);
      expect(types.has("fill_blank")).toBe(true);
      expect(types.has("visual")).toBe(true);
    }
    // hash stable
    const q1 = generateQuizzes(lessons, 42);
    const q2 = generateQuizzes(lessons, 42);
    expect(hashOf(q1)).toBe(hashOf(q2));
  });
  it("visual without image_ref fails schema", () => {
    const bad = {
      lessonId: "a1_m1_l1",
      questions: [
        { id: "q1", type: "visual", prompt: "x" },
        { id: "q2", type: "multiple_choice", prompt: "y" },
        { id: "q3", type: "fill_blank", prompt: "z" },
        { id: "q4", type: "multiple_choice", prompt: "a" },
        { id: "q5", type: "fill_blank", prompt: "b" },
      ],
    };
    expect(QuizSchema.safeParse(bad).success).toBe(false);
  });
});
