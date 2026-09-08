import type { PronunciationScore } from "./types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[.,!?;:'"()]/g, "").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
  return dp[m]![n]!;
}

export function scorePronunciation(reference: string, transcript: string): PronunciationScore {
  const refWords = normalize(reference).split(" ").filter(Boolean);
  const hypWords = normalize(transcript).split(" ").filter(Boolean);
  if (refWords.length === 0) return { overall: 0, wordScores: [], wer: 1 };

  const wordScores = refWords.map((w, i) => {
    const h = hypWords[i] ?? "";
    const dist = levenshtein(w, h);
    const maxLen = Math.max(w.length, h.length, 1);
    const score = Math.max(0, 100 - (dist / maxLen) * 100);
    return { word: w, score: Math.round(score), matched: w === h };
  });

  const matched = wordScores.filter((w) => w.matched).length;
  const wer = 1 - matched / refWords.length;
  const overall = Math.round(wordScores.reduce((s, w) => s + w.score, 0) / wordScores.length);
  return { overall, wordScores, wer };
}

export function wer(reference: string, hypothesis: string): number {
  return scorePronunciation(reference, hypothesis).wer;
}
