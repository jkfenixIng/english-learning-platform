import type { EvaluationResult } from "../../types";
import type { WritingPrompt, WritingAnswer } from "./schema";
export function evaluateWritingPrompt(prompt: WritingPrompt, _solution: unknown, answer: WritingAnswer): EvaluationResult {
  const words = answer.text.trim().split(/\s+/).filter(Boolean).length;
  if (words < prompt.minWords) return { score: 40, feedback: `Too short: ${words} words, need at least ${prompt.minWords}. Keep writing!` };
  if (words > prompt.maxWords + 50) return { score: 70, feedback: `Good effort (${words} words) — try to be more concise (target ${prompt.maxWords}).` };
  // Heuristic: length OK => 75, AI correction will refine in route handler
  return { score: 75, feedback: `Good — ${words} words. AI feedback will appear shortly.` };
}
