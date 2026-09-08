import type { EvaluationResult } from "../../types";
import type { TransformationSolution, TransformationAnswer } from "./schema";
function norm(s: string) { return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]$/, ""); }
export function evaluateTransformation(_p: unknown, solution: TransformationSolution, answer: TransformationAnswer): EvaluationResult {
  const given = norm(answer.text);
  const match = solution.accepted.some((a) => norm(a) === given);
  return { score: match ? 100 : 0, correct: match, feedback: match ? "Correct transformation!" : `Expected one of: ${solution.accepted.join(" | ")}` };
}
