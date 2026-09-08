import type { EvaluationResult } from "../../types";
import type { GradedReadingSolution, GradedReadingAnswer } from "./schema";
export function evaluateGradedReading(_p: unknown, solution: GradedReadingSolution, answer: GradedReadingAnswer): EvaluationResult {
  const ids = Object.keys(solution.answers);
  if (ids.length === 0) return { score: 0, feedback: "No questions" };
  let correct = 0;
  for (const id of ids) if (answer.answers[id] === solution.answers[id]) correct++;
  const score = Math.round((correct / ids.length) * 100);
  return { score, correct: score === 100, feedback: `${correct}/${ids.length} correct` };
}
