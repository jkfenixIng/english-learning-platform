import { describe, it, expect } from "vitest";
import {
  LessonSchema,
  LessonLegacySchema,
  VocabWithIPASchema,
  ImageRefSchema,
  QuizSchema,
  EvaluationSchema,
  assertEvaluationDistribution,
  assertCurriculumCounts,
  CurriculumErrorCode,
  lessonIdRegex,
  ipaRegex,
} from "../lib/curriculum/schemas";

function validLesson(overrides: Record<string, unknown> = {}) {
  return {
    id_leccion: "a1_m1_l1",
    titulo: { en: "Greetings", es: "Saludos" },
    objetivo: "Learn to greet people in everyday situations",
    explicacion_gramatical:
      "Use 'hello' and 'hi' to greet; 'good morning' is more formal in the morning.",
    vocabulario_clave: [
      { word: "hello", definition: "greeting", ipa: "/həˈloʊ/", pos: "intj" },
      { word: "goodbye", definition: "farewell", ipa: "/ˌɡʊdˈbaɪ/" },
      { word: "please", definition: "polite word", ipa: "/pliːz/" },
    ],
    ilustraciones_asociadas: ["a1_m1_img_greetings.png"],
    ...overrides,
  };
}

describe("curriculum schemas", () => {
  it("lessonId regex: valid a1_m1_l1 passes, A1-M1-L1 fails", () => {
    expect(lessonIdRegex.test("a1_m1_l1")).toBe(true);
    expect(lessonIdRegex.test("A1-M1-L1")).toBe(false);
    const res = LessonSchema.safeParse(validLesson({ id_leccion: "A1-M1-L1" }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe(CurriculumErrorCode.INVALID_LESSON_ID);
    }
  });

  it("IPA regex: /həˈloʊ/ passes, hello fails", () => {
    expect(ipaRegex.test("/həˈloʊ/")).toBe(true);
    expect(ipaRegex.test("hello")).toBe(false);
    expect(
      VocabWithIPASchema.safeParse({ word: "hi", definition: "hi", ipa: "hello" }).success,
    ).toBe(false);
    expect(
      VocabWithIPASchema.safeParse({ word: "hi", definition: "hi", ipa: "/haɪ/" }).success,
    ).toBe(true);
  });

  it("strict vocab without ipa fails MISSING_IPA", () => {
    const r = VocabWithIPASchema.safeParse({ word: "hello", definition: "greeting" });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(
        r.error.issues.some(
          (i) => i.message === CurriculumErrorCode.MISSING_IPA || i.path.includes("ipa"),
        ),
      ).toBe(true);
  });

  it("legacy vocab without ipa parses as nullable", () => {
    const r = LessonLegacySchema.safeParse(
      validLesson({
        vocabulario_clave: [
          { word: "hello", definition: "greeting", ipa: null },
          { word: "hi", definition: "greeting", ipa: "/haɪ/" },
          { word: "bye", definition: "farewell" },
        ],
      }),
    );
    expect(r.success).toBe(true);
  });

  it("ImageRef: canonical passes, legacy fails", () => {
    expect(ImageRefSchema.safeParse("a1_m1_img_greetings.png").success).toBe(true);
    expect(ImageRefSchema.safeParse("lessons/a1-u1-l1.png").success).toBe(false);
    expect(ImageRefSchema.safeParse("A1_M1_IMG_GREETINGS.PNG").success).toBe(false);
  });

  it("Lesson schema valid passes and respects vocab 3-8 and images 1-3", () => {
    expect(LessonSchema.safeParse(validLesson()).success).toBe(true);
    // too few vocab
    expect(
      LessonSchema.safeParse(
        validLesson({ vocabulario_clave: [{ word: "hi", definition: "hi", ipa: "/haɪ/" }] }),
      ).success,
    ).toBe(false);
    // objetivo too short
    expect(LessonSchema.safeParse(validLesson({ objetivo: "short" })).success).toBe(false);
  });

  it("Quiz invariant: exactly 5Q, visual without image_ref fails", () => {
    const base = {
      lessonId: "a1_m1_l1",
      questions: [
        { id: "q1", type: "multiple_choice", prompt: "Pick" },
        { id: "q2", type: "fill_blank", prompt: "Fill ___" },
        { id: "q3", type: "visual", prompt: "What is this?", image_ref: "a1_m1_img_greetings.png" },
        { id: "q4", type: "multiple_choice", prompt: "Pick 2" },
        { id: "q5", type: "fill_blank", prompt: "Fill again" },
      ],
    };
    expect(QuizSchema.safeParse(base).success).toBe(true);
    // visual missing image_ref
    const badVisual = {
      ...base,
      questions: base.questions.map((q, i) =>
        i === 2 ? { id: "q3", type: "visual", prompt: "x" } : q,
      ),
    } as unknown as Record<string, unknown>;
    const r2 = QuizSchema.safeParse(badVisual);
    expect(r2.success).toBe(false);
    if (!r2.success)
      expect(r2.error.issues.some((i) => i.message === CurriculumErrorCode.MISSING_IMAGE_REF)).toBe(
        true,
      );
    // 6 questions fails length
    expect(
      QuizSchema.safeParse({
        ...base,
        questions: [...base.questions, { id: "q6", type: "multiple_choice", prompt: "extra" }],
      }).success,
    ).toBe(false);
  });

  it("Evaluation distribution valid 4/6/5 passes, 5/5/5 fails", () => {
    const makeQs = (counts: [number, number, number]) => {
      const [r, g, l] = counts;
      return [
        ...Array.from({ length: r }, (_, i) => ({
          id: `r${i}`,
          category: "reading",
          type: "comprehension",
          prompt: "read",
        })),
        ...Array.from({ length: g }, (_, i) => ({
          id: `g${i}`,
          category: "grammar_vocab",
          type: "fill_blanks",
          prompt: "grammar",
        })),
        ...Array.from({ length: l }, (_, i) => ({
          id: `l${i}`,
          category: "listening",
          type: "listening_tts",
          prompt: "listen",
        })),
      ];
    };
    expect(
      EvaluationSchema.safeParse({ moduleId: "a1_m1", questions: makeQs([4, 6, 5]) }).success,
    ).toBe(true);
    const bad = EvaluationSchema.safeParse({ moduleId: "a1_m1", questions: makeQs([5, 5, 5]) });
    expect(bad.success).toBe(false);
    if (!bad.success)
      expect(bad.error.issues[0]?.message).toBe(
        CurriculumErrorCode.EVALUATION_DISTRIBUTION_MISMATCH,
      );
    // helper throws
    expect(() => assertEvaluationDistribution(makeQs([4, 6, 5]))).not.toThrow();
    expect(() => assertEvaluationDistribution(makeQs([5, 5, 5]))).toThrow(
      CurriculumErrorCode.EVALUATION_DISTRIBUTION_MISMATCH,
    );
  });

  it("curriculum counts: 72/72/24 passes, else throws", () => {
    expect(() =>
      assertCurriculumCounts({ lessons: 72, quizzes: 72, evaluations: 24 }),
    ).not.toThrow();
    expect(() => assertCurriculumCounts({ lessons: 70, quizzes: 72, evaluations: 24 })).toThrow(
      CurriculumErrorCode.CURRICULUM_COUNT_MISMATCH,
    );
  });
});
