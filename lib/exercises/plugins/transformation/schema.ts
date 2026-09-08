import { z } from "zod";
export const TransformationPromptSchema = z.object({ instruction: z.string(), sentence: z.string() });
export const TransformationSolutionSchema = z.object({ accepted: z.array(z.string()).min(1) });
export const TransformationAnswerSchema = z.object({ text: z.string().min(1) });
export type TransformationPrompt = z.infer<typeof TransformationPromptSchema>;
export type TransformationSolution = z.infer<typeof TransformationSolutionSchema>;
export type TransformationAnswer = z.infer<typeof TransformationAnswerSchema>;
