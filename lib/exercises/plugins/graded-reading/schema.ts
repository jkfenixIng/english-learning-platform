import { z } from "zod";
export const GradedReadingPromptSchema = z.object({
  title: z.string(),
  passage: z.string(),
  vocab: z.array(z.object({ word: z.string(), definition: z.string() })).optional(),
  questions: z.array(z.object({ id: z.string(), question: z.string(), options: z.array(z.string()), answer: z.string() })),
});
export const GradedReadingSolutionSchema = z.object({
  answers: z.record(z.string(), z.string()),
});
export const GradedReadingAnswerSchema = z.object({
  answers: z.record(z.string(), z.string()),
});
export type GradedReadingPrompt = z.infer<typeof GradedReadingPromptSchema>;
export type GradedReadingSolution = z.infer<typeof GradedReadingSolutionSchema>;
export type GradedReadingAnswer = z.infer<typeof GradedReadingAnswerSchema>;
