import { z } from "zod";

const ImageAssetSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

export const MatchingPromptSchema = z.object({
  pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })).min(2),
  imageUrl: z.string().optional(),
  images: z.array(ImageAssetSchema).optional(),
});
export const MatchingSolutionSchema = z.object({
  pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })),
});
export const MatchingAnswerSchema = z.object({ matches: z.record(z.string(), z.string()) });
export type MatchingPrompt = z.infer<typeof MatchingPromptSchema>;
export type MatchingSolution = z.infer<typeof MatchingSolutionSchema>;
export type MatchingAnswer = z.infer<typeof MatchingAnswerSchema>;
