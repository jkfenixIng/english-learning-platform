import { z } from "zod";

const ImageAssetSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

export const FlashcardPromptSchema = z.object({
  front: z.string(),
  back: z.string(),
  imageUrl: z.string().optional(),
  images: z.array(ImageAssetSchema).optional(),
  hint: z.string().optional(),
});
export const FlashcardSolutionSchema = z.object({ back: z.string() });
export const FlashcardAnswerSchema = z.object({
  revealed: z.boolean().optional(),
  typed: z.string().optional(),
});
export type FlashcardPrompt = z.infer<typeof FlashcardPromptSchema>;
export type FlashcardSolution = z.infer<typeof FlashcardSolutionSchema>;
export type FlashcardAnswer = z.infer<typeof FlashcardAnswerSchema>;
