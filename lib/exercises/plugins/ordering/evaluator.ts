import type { EvaluationResult } from "../../types";
import type { OrderingSolution, OrderingAnswer } from "./schema";
export function evaluateOrdering(_p: unknown, solution: OrderingSolution, answer: OrderingAnswer): EvaluationResult {
  const expected = solution.order;
  const given = answer.order;
  if (expected.length === 0) return { score: 0, feedback: "No order defined" };
  let correctPos = 0;
  for (let i = 0; i < expected.length; i++) if (expected[i] === given[i]) correctPos++;
  const score = Math.round((correctPos / expected.length) * 100);
  const perfect = score === 100;
  return { score, correct: perfect, feedback: perfect ? "Perfect order!" : `${correctPos}/${expected.length} in correct position`, details: { correctPos, total: expected.length } };
}
