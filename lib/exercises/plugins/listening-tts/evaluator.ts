import type { EvaluationResult } from "../../types";
import type { ListeningTtsSolution, ListeningTtsAnswer } from "./schema";
export function evaluateListeningTts(_p: unknown, solution: ListeningTtsSolution, answer: ListeningTtsAnswer): EvaluationResult {
  const correct = answer.answer.trim().toLowerCase() === solution.answer.trim().toLowerCase();
  return { score: correct ? 100 : 0, correct, feedback: correct ? "Correct!" : `Expected: ${solution.answer}` };
}
