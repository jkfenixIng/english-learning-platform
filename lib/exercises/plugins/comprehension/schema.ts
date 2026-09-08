import { z } from "zod";
export const ComprehensionPromptSchema = z.object({ passage: z.string(), question: z.string(), options: z.array(z.string()).min(2), hint: z.string().optional() });
export const ComprehensionSolutionSchema = z.object({ answer: z.string() });
export const ComprehensionAnswerSchema = z.object({ answer: z.string() });
export type ComprehensionPrompt = z.infer<typeof ComprehensionPromptSchema>;
export type ComprehensionSolution = z.infer<typeof ComprehensionSolutionSchema>;
export type ComprehensionAnswer = z.infer<typeof ComprehensionAnswerSchema>;
