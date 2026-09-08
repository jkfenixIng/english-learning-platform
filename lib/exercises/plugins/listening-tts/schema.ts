import { z } from "zod";
export const ListeningTtsPromptSchema = z.object({ text: z.string(), question: z.string(), options: z.array(z.string()).optional() });
export const ListeningTtsSolutionSchema = z.object({ answer: z.string() });
export const ListeningTtsAnswerSchema = z.object({ answer: z.string() });
export type ListeningTtsPrompt = z.infer<typeof ListeningTtsPromptSchema>;
export type ListeningTtsSolution = z.infer<typeof ListeningTtsSolutionSchema>;
export type ListeningTtsAnswer = z.infer<typeof ListeningTtsAnswerSchema>;
