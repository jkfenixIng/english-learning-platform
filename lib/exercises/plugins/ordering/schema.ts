import { z } from "zod";
export const OrderingPromptSchema = z.object({ tokens: z.array(z.string()).min(2), hint: z.string().optional() });
export const OrderingSolutionSchema = z.object({ order: z.array(z.string()) });
export const OrderingAnswerSchema = z.object({ order: z.array(z.string()) });
export type OrderingPrompt = z.infer<typeof OrderingPromptSchema>;
export type OrderingSolution = z.infer<typeof OrderingSolutionSchema>;
export type OrderingAnswer = z.infer<typeof OrderingAnswerSchema>;
