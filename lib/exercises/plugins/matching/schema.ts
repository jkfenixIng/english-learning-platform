import { z } from "zod";
export const MatchingPromptSchema = z.object({ pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })).min(2) });
export const MatchingSolutionSchema = z.object({ pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })) });
export const MatchingAnswerSchema = z.object({ matches: z.record(z.string(), z.string()) });
export type MatchingPrompt = z.infer<typeof MatchingPromptSchema>;
export type MatchingSolution = z.infer<typeof MatchingSolutionSchema>;
export type MatchingAnswer = z.infer<typeof MatchingAnswerSchema>;
