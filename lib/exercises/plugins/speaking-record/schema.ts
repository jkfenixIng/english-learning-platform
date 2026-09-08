import { z } from "zod";
export const SpeakingRecordPromptSchema = z.object({ text: z.string(), instruction: z.string().optional() });
export const SpeakingRecordSolutionSchema = z.object({ reference: z.string() });
export const SpeakingRecordAnswerSchema = z.object({ transcript: z.string(), fallbackTyped: z.string().optional() });
export type SpeakingRecordPrompt = z.infer<typeof SpeakingRecordPromptSchema>;
export type SpeakingRecordSolution = z.infer<typeof SpeakingRecordSolutionSchema>;
export type SpeakingRecordAnswer = z.infer<typeof SpeakingRecordAnswerSchema>;
