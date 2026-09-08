import type { EvaluationResult } from "../../types";
import type { MatchingSolution, MatchingAnswer } from "./schema";
export function evaluateMatching(_p: unknown, solution: MatchingSolution, answer: MatchingAnswer): EvaluationResult {
  const total = solution.pairs.length;
  let correct = 0;
  for (const pair of solution.pairs) {
    if (answer.matches[pair.left] === pair.right) correct++;
  }
  const score = Math.round((correct / total) * 100);
  return { score, correct: score === 100, feedback: score === 100 ? "All matched!" : `${correct}/${total} correct` };
}
