import { z } from "zod";
export const PronunciationPromptSchema = z.object({ word: z.string(), phonetic: z.string().optional(), example: z.string().optional() });
export const PronunciationSolutionSchema = z.object({ word: z.string() });
export const PronunciationAnswerSchema = z.object({ transcript: z.string(), fallbackTyped: z.string().optional() });
export type PronunciationPrompt = z.infer<typeof PronunciationPromptSchema>;
export type PronunciationSolution = z.infer<typeof PronunciationSolutionSchema>;
export type PronunciationAnswer = z.infer<typeof PronunciationAnswerSchema>;
