import type { EvaluationResult } from "../../types";
import type { DictationSolution, DictationAnswer } from "./schema";
function norm(s: string) { return s.trim().toLowerCase().replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " "); }
export function evaluateDictation(_p: unknown, solution: DictationSolution, answer: DictationAnswer): EvaluationResult {
  const a = norm(answer.text);
  const b = norm(solution.text);
  if (a === b) return { score: 100, correct: true, feedback: "Perfect dictation!" };
  // WER-like token accuracy
  const at = a.split(" "), bt = b.split(" ");
  let correct = 0;
  for (let i = 0; i < bt.length; i++) if (at[i] === bt[i]) correct++;
  const score = Math.round((correct / bt.length) * 100);
  return { score, correct: false, feedback: score >= 80 ? "Very good — minor errors" : `Expected: "${solution.text}"` };
}
