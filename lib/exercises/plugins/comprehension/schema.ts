import { z } from "zod";

const ImageAssetSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

export const ComprehensionPromptSchema = z.object({
  passage: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2),
  hint: z.string().optional(),
  imageUrl: z.string().optional(),
  images: z.array(ImageAssetSchema).optional(),
});
export const ComprehensionSolutionSchema = z.object({ answer: z.string() });
export const ComprehensionAnswerSchema = z.object({ answer: z.string() });
export type ComprehensionPrompt = z.infer<typeof ComprehensionPromptSchema>;
export type ComprehensionSolution = z.infer<typeof ComprehensionSolutionSchema>;
export type ComprehensionAnswer = z.infer<typeof ComprehensionAnswerSchema>;
