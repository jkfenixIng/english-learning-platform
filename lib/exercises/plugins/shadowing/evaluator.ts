import type { EvaluationResult } from "../../types";
import type { ShadowingSolution, ShadowingAnswer } from "./schema";
import { scorePronunciation } from "../../../speech/scoring";
export function evaluateShadowing(_p: unknown, solution: ShadowingSolution, answer: ShadowingAnswer): EvaluationResult {
  const text = answer.transcript || answer.fallbackTyped || "";
  if (!text.trim()) return { score: 0, feedback: "No speech captured" };
  const { overall, wordScores } = scorePronunciation(solution.reference, text);
  return { score: overall, feedback: overall >= 70 ? "Great shadowing!" : "Listen again and try to match rhythm", details: { wordScores } };
}
