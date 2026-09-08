import type { EvaluationResult } from "../../types";
import type { PronunciationSolution, PronunciationAnswer } from "./schema";
import { scorePronunciation } from "../../../speech/scoring";
export function evaluatePronunciation(_p: unknown, solution: PronunciationSolution, answer: PronunciationAnswer): EvaluationResult {
  const text = answer.transcript || answer.fallbackTyped || "";
  if (!text.trim()) return { score: 0, feedback: "No input" };
  const { overall, wordScores, wer } = scorePronunciation(solution.word, text);
  return { score: overall, feedback: overall >= 80 ? "Excellent!" : overall >= 50 ? "Good — practice more" : "Try again, focus on sounds", details: { wordScores, wer } };
}
