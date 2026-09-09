import { z } from "zod";

const ImageAssetSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

export const GradedReadingPromptSchema = z.object({
  title: z.string(),
  passage: z.string(),
  vocab: z.array(z.object({ word: z.string(), definition: z.string() })).optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
    }),
  ),
  // Optional illustrative images for the passage
  imageUrl: z.string().optional(),
  images: z.array(ImageAssetSchema).optional(),
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
