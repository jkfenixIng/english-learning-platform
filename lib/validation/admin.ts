import { z } from "zod";

export const levelSchema = z.object({
  code: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  title: z.string().min(2).max(80),
  description: z.string().min(2).max(200),
  orderIndex: z.coerce.number().int().min(1).max(99),
});

export const unitSchema = z.object({
  levelId: z.string().uuid(),
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(300),
  orderIndex: z.coerce.number().int().min(1).max(99),
});

export const lessonSchema = z.object({
  unitId: z.string().uuid(),
  title: z.string().min(2).max(120),
  objectives: z.string().min(2).max(500),
  orderIndex: z.coerce.number().int().min(1).max(99),
  estimatedMinutes: z.coerce.number().int().min(1).max(180),
  isQuiz: z.coerce.boolean().optional(),
  isExam: z.coerce.boolean().optional(),
  kind: z.enum(["teach", "practice", "quiz", "exam"]).optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
  bodyMarkdown: z.string().max(20000).optional(),
  content: z.any().optional(),
});

const exerciseImageAssetSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

export const exerciseAdminSchema = z.object({
  lessonId: z.string().uuid(),
  type: z.enum([
    "fill_blanks",
    "ordering",
    "transformation",
    "flashcard",
    "matching",
    "listening_tts",
    "dictation",
    "comprehension",
    "graded_reading",
    "writing_prompt",
    "speaking_record",
    "shadowing",
    "pronunciation",
  ]),
  difficulty: z.coerce.number().int().min(1).max(5),
  prompt: z.any(),
  solution: z.any(),
  aiGenerated: z.coerce.boolean().optional(),
  assets: z
    .object({
      images: z.array(exerciseImageAssetSchema).optional(),
    })
    .optional()
    .nullable(),
});

export const challengeAdminSchema = z.object({
  type: z.enum(["daily", "weekly", "timed", "streak", "competitive"]),
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(500),
  rewardXp: z.coerce.number().int().min(1).max(1000),
  startAt: z.string(),
  endAt: z.string(),
});

export const badgeAdminSchema = z.object({
  code: z.string().min(2).max(40),
  title: z.string().min(2).max(80),
  description: z.string().min(2).max(200),
  icon: z.string().min(1).max(10),
  isPremium: z.coerce.boolean().optional(),
});

export const shopAdminSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().min(2).max(200),
  priceXp: z.coerce.number().int().min(1).max(5000),
  cosmeticType: z.string().min(2).max(20),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  isPremium: z.coerce.boolean().optional(),
});
