import type { EvaluationResult } from "../../types";
import type { FillBlanksPrompt, FillBlanksSolution, FillBlanksAnswer } from "./schema";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function evaluateFillBlanks(
  _prompt: FillBlanksPrompt,
  solution: FillBlanksSolution,
  answer: FillBlanksAnswer,
): EvaluationResult {
  const blankIds = Object.keys(solution.answers);
  if (blankIds.length === 0) return { score: 0, feedback: "No blanks defined" };
  let correct = 0;
  for (const id of blankIds) {
    const accepted = solution.answers[id] ?? [];
    const given = normalize(answer.answers[id] ?? "");
    if (accepted.some((a) => normalize(a) === given)) correct++;
  }
  const score = Math.round((correct / blankIds.length) * 100);
  return {
    score,
    correct: score === 100,
    feedback: score === 100 ? "Correct!" : `${correct}/${blankIds.length} blanks correct`,
  };
}
