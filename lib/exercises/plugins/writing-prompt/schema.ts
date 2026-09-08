import { z } from "zod";
export const WritingPromptSchema = z.object({ prompt: z.string(), minWords: z.number().default(30), maxWords: z.number().default(150) });
export const WritingSolutionSchema = z.object({ sampleAnswer: z.string(), criteria: z.array(z.string()).optional() });
export const WritingAnswerSchema = z.object({ text: z.string().min(1) });
export type WritingPrompt = z.infer<typeof WritingPromptSchema>;
export type WritingSolution = z.infer<typeof WritingSolutionSchema>;
export type WritingAnswer = z.infer<typeof WritingAnswerSchema>;
