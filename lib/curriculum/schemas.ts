import { z } from "zod";

// --- Error codes (REQ-VAL-001) ---
export const CurriculumErrorCode = {
  INVALID_LESSON_ID: "INVALID_LESSON_ID",
  MISSING_IPA: "MISSING_IPA",
  INVALID_IPA: "INVALID_IPA",
  MISSING_IMAGE_REF: "MISSING_IMAGE_REF",
  UNRESOLVED_IMAGE_REF: "UNRESOLVED_IMAGE_REF",
  EVALUATION_DISTRIBUTION_MISMATCH: "EVALUATION_DISTRIBUTION_MISMATCH",
  CURRICULUM_COUNT_MISMATCH: "CURRICULUM_COUNT_MISMATCH",
  SCHEMA_DIVERGENCE: "SCHEMA_DIVERGENCE",
} as const;

export type CurriculumErrorCode = (typeof CurriculumErrorCode)[keyof typeof CurriculumErrorCode];

// --- Regexes derived from JSON Schema ---
export const lessonIdRegex = /^[a-c][12]_m[1-4]_l[1-3]$/;
export const moduleIdRegex = /^[a-c][12]_m[1-4]$/;
export const ipaRegex = /^\/.+\/$/;
export const imageRefRegex = /^[a-c][12]_m[1-4]_(img|audio|ill)_[a-z0-9_]+\.png$/;

// --- Primitive schemas ---
export const ImageRefSchema = z
  .string()
  .regex(imageRefRegex, CurriculumErrorCode.MISSING_IMAGE_REF);

export const LessonIdSchema = z
  .string()
  .regex(lessonIdRegex, CurriculumErrorCode.INVALID_LESSON_ID);

export const ModuleIdSchema = z
  .string()
  .regex(moduleIdRegex, CurriculumErrorCode.INVALID_LESSON_ID);

export const IpaSchema = z.string().regex(ipaRegex, CurriculumErrorCode.INVALID_IPA);

// --- Vocab ---
export const VocabWithIPASchema = z.object({
  word: z.string().min(1),
  definition: z.string().min(1),
  definitionEs: z.string().optional(),
  example: z.string().optional(),
  exampleEs: z.string().optional(),
  ipa: z.string().regex(ipaRegex, CurriculumErrorCode.MISSING_IPA),
  pos: z.string().optional(),
});

export const VocabLegacySchema = z.object({
  word: z.string().min(1),
  definition: z.string().min(1),
  definitionEs: z.string().optional(),
  example: z.string().optional(),
  exampleEs: z.string().optional(),
  ipa: z.string().regex(ipaRegex, CurriculumErrorCode.INVALID_IPA).nullable().optional(),
  pos: z.string().optional(),
});

export type VocabWithIPA = z.infer<typeof VocabWithIPASchema>;
export type VocabLegacy = z.infer<typeof VocabLegacySchema>;

// --- Lesson ---
export const LessonSchema = z.object({
  id_leccion: LessonIdSchema,
  titulo: z.object({
    en: z.string().min(1),
    es: z.string().min(1),
  }),
  objetivo: z.string().min(10).max(300),
  explicacion_gramatical: z.string().min(20),
  vocabulario_clave: z.array(VocabWithIPASchema).min(3).max(8),
  ilustraciones_asociadas: z.array(ImageRefSchema).min(1).max(3),
  moduleId: ModuleIdSchema.optional(),
});

export const LessonLegacySchema = LessonSchema.extend({
  vocabulario_clave: z.array(VocabLegacySchema).min(3).max(8),
});

export type LessonDTO = z.infer<typeof LessonSchema>;

// --- Quiz ---
const QuizQuestionBase = z.object({
  id: z.string().min(1),
  type: z.enum(["multiple_choice", "fill_blank", "visual"]),
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
  image_ref: ImageRefSchema.optional(),
});

export const QuizQuestionSchema = QuizQuestionBase.superRefine((val, ctx) => {
  if (val.type === "visual" && !val.image_ref) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: CurriculumErrorCode.MISSING_IMAGE_REF,
      path: ["image_ref"],
    });
  }
});

export const QuizSchema = z.object({
  lessonId: LessonIdSchema,
  questions: z.array(QuizQuestionSchema).length(5),
});

export type QuizDTO = z.infer<typeof QuizSchema>;

// --- Evaluation ---
export const EvaluationQuestionSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["reading", "grammar_vocab", "listening"]),
  type: z.string().min(1),
  prompt: z.string().min(1),
  answer: z.string().optional(),
});

export const EvaluationSchema = z
  .object({
    moduleId: ModuleIdSchema,
    questions: z.array(EvaluationQuestionSchema).length(15),
  })
  .superRefine((val, ctx) => {
    const counts = { reading: 0, grammar_vocab: 0, listening: 0 };
    for (const q of val.questions) counts[q.category]++;
    if (counts.reading !== 4 || counts.grammar_vocab !== 6 || counts.listening !== 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: CurriculumErrorCode.EVALUATION_DISTRIBUTION_MISMATCH,
        path: ["questions"],
      });
    }
  });

export type EvaluationDTO = z.infer<typeof EvaluationSchema>;

// --- Distribution helper (explicit per spec) ---
export function assertEvaluationDistribution(questions: { category: string }[]): void {
  const counts = { reading: 0, grammar_vocab: 0, listening: 0 };
  for (const q of questions) {
    if (q.category in counts) counts[q.category as keyof typeof counts]++;
  }
  if (counts.reading !== 4 || counts.grammar_vocab !== 6 || counts.listening !== 5) {
    throw new Error(
      `${CurriculumErrorCode.EVALUATION_DISTRIBUTION_MISMATCH}: expected 4/6/5 got ${counts.reading}/${counts.grammar_vocab}/${counts.listening}`,
    );
  }
}

// --- Curriculum counts validator ---
export function assertCurriculumCounts(args: {
  lessons: number;
  quizzes: number;
  evaluations: number;
}): void {
  if (args.lessons !== 72 || args.quizzes !== 72 || args.evaluations !== 24) {
    throw new Error(
      `${CurriculumErrorCode.CURRICULUM_COUNT_MISMATCH}: expected 72/72/24 got ${args.lessons}/${args.quizzes}/${args.evaluations}`,
    );
  }
}
