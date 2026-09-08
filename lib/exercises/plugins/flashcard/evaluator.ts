import type { EvaluationResult } from "../../types";
import type { FlashcardPrompt, FlashcardAnswer } from "./schema";
export function evaluateFlashcard(prompt: FlashcardPrompt, _solution: unknown, answer: FlashcardAnswer): EvaluationResult {
  if (answer.typed !== undefined) {
    const correct = answer.typed.trim().toLowerCase() === prompt.back.trim().toLowerCase();
    return { score: correct ? 100 : 50, correct, feedback: correct ? "Correct!" : `Answer: ${prompt.back} — keep practicing!` };
  }
  return { score: 100, correct: true, feedback: "Reviewed" };
}
