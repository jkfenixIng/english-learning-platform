import type { EvaluationResult } from "../../types";
import type { SpeakingRecordSolution, SpeakingRecordAnswer } from "./schema";
import { scorePronunciation } from "../../../speech/scoring";
export function evaluateSpeakingRecord(_p: unknown, solution: SpeakingRecordSolution, answer: SpeakingRecordAnswer): EvaluationResult {
  const text = answer.transcript || answer.fallbackTyped || "";
  if (!text.trim()) return { score: 0, feedback: "No speech detected. Try typing your response." };
  const { overall, wordScores } = scorePronunciation(solution.reference, text);
  return { score: overall, feedback: overall >= 70 ? "Great pronunciation!" : "Keep practicing — see word scores below", details: { wordScores } };
}
