import type { EvaluationResult } from "../../types";
import type { ComprehensionSolution, ComprehensionAnswer } from "./schema";
export function evaluateComprehension(_p: unknown, solution: ComprehensionSolution, answer: ComprehensionAnswer): EvaluationResult {
  const correct = answer.answer.trim() === solution.answer.trim();
  return { score: correct ? 100 : 0, correct, feedback: correct ? "Correct!" : `Correct answer: ${solution.answer}` };
}
