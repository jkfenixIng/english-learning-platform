import { z } from "zod";
export const DictationPromptSchema = z.object({ text: z.string(), playsAllowed: z.number().default(1) });
export const DictationSolutionSchema = z.object({ text: z.string() });
export const DictationAnswerSchema = z.object({ text: z.string() });
export type DictationPrompt = z.infer<typeof DictationPromptSchema>;
export type DictationSolution = z.infer<typeof DictationSolutionSchema>;
export type DictationAnswer = z.infer<typeof DictationAnswerSchema>;
