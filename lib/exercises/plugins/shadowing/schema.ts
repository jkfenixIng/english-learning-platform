import { z } from "zod";
export const ShadowingPromptSchema = z.object({ reference: z.string(), speed: z.number().optional() });
export const ShadowingSolutionSchema = z.object({ reference: z.string() });
export const ShadowingAnswerSchema = z.object({ transcript: z.string(), fallbackTyped: z.string().optional() });
export type ShadowingPrompt = z.infer<typeof ShadowingPromptSchema>;
export type ShadowingSolution = z.infer<typeof ShadowingSolutionSchema>;
export type ShadowingAnswer = z.infer<typeof ShadowingAnswerSchema>;
