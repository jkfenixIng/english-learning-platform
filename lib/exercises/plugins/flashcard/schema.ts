import { z } from "zod";
export const FlashcardPromptSchema = z.object({ front: z.string(), back: z.string(), imageUrl: z.string().optional(), hint: z.string().optional() });
export const FlashcardSolutionSchema = z.object({ back: z.string() });
export const FlashcardAnswerSchema = z.object({ revealed: z.boolean().optional(), typed: z.string().optional() });
export type FlashcardPrompt = z.infer<typeof FlashcardPromptSchema>;
export type FlashcardSolution = z.infer<typeof FlashcardSolutionSchema>;
export type FlashcardAnswer = z.infer<typeof FlashcardAnswerSchema>;
