import { z } from "zod";

export const FillBlanksPromptSchema = z.object({
  text: z.string().min(1),
  blanks: z.array(z.object({ id: z.string(), hint: z.string().optional() })),
});

export const FillBlanksSolutionSchema = z.object({
  answers: z.record(z.string(), z.array(z.string())),
});

export const FillBlanksAnswerSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export type FillBlanksPrompt = z.infer<typeof FillBlanksPromptSchema>;
export type FillBlanksSolution = z.infer<typeof FillBlanksSolutionSchema>;
export type FillBlanksAnswer = z.infer<typeof FillBlanksAnswerSchema>;
