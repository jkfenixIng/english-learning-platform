export type ExerciseType =
  | "fill_blanks"
  | "ordering"
  | "transformation"
  | "flashcard"
  | "matching"
  | "listening_tts"
  | "dictation"
  | "comprehension"
  | "graded_reading"
  | "writing_prompt"
  | "speaking_record"
  | "shadowing"
  | "pronunciation";

export interface EvaluationResult {
  score: number; // 0-100
  feedback: string;
  details?: unknown;
  correct?: boolean;
}

export interface ExerciseImageAsset {
  url: string;
  alt: string;
  caption?: string;
}

export interface ExerciseAssets {
  images?: ExerciseImageAsset[];
}

export interface ExercisePlugin<TPrompt = unknown, TAnswer = unknown> {
  type: ExerciseType;
  promptSchema: import("zod").ZodType<TPrompt>;
  answerSchema: import("zod").ZodType<TAnswer>;
  solutionSchema: import("zod").ZodType<unknown>;
  evaluate(prompt: TPrompt, solution: unknown, answer: TAnswer): EvaluationResult;
  // Renderer is a React component - kept loosely typed to avoid circular deps in Node tests
  Renderer?: unknown;
}
