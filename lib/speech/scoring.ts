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

// Very lightweight phoneme heuristic: groups confusable sounds
const PHONEME_GROUPS: Record<string, string> = {
  th: "dental", sh: "sibilant", ch: "affricate", r: "rhotic", l: "lateral",
};
function phonemeHeuristicPenalty(ref: string, hyp: string): number {
  if (ref.includes("th") && !hyp.includes("th")) return 8;
  if (ref.includes("r") && !hyp.includes("r")) return 5;
  return 0;
}

export function scorePronunciation(reference: string, transcript: string): PronunciationScore {
  const refWords = normalize(reference).split(" ").filter(Boolean);
  const hypWords = normalize(transcript).split(" ").filter(Boolean);
  if (refWords.length === 0) return { overall: 0, wordScores: [], wer: 1 };

  const wordScores = refWords.map((w, i) => {
    const h = hypWords[i] ?? "";
    const dist = levenshtein(w, h);
    const maxLen = Math.max(w.length, h.length, 1);
    let score = Math.max(0, 100 - (dist / maxLen) * 100);
    score -= phonemeHeuristicPenalty(w, h);
    score = Math.max(0, score);
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

export function getPronunciationFeedback(reference: string, transcript: string): string | null {
  const { overall, wordScores } = scorePronunciation(reference, transcript);
  if (overall >= 85) return null;
  const worst = [...wordScores].sort((a, b) => a.score - b.score)[0];
  if (!worst) return null;
  if (worst.word.includes("th")) return `Try rounding your dental fricative for "${worst.word}" — tongue between teeth, gentle airflow.`;
  if (worst.word.includes("r")) return `Focus on the rhotic "${worst.word}" — curl tongue slightly, avoid tapping.`;
  return `Work on "${worst.word}" — compare your recording to the reference and shadow the rhythm.`;
}

export function diffWords(reference: string, transcript: string): { word: string; status: "match" | "miss" | "extra" }[] {
  const ref = normalize(reference).split(" ").filter(Boolean);
  const hyp = normalize(transcript).split(" ").filter(Boolean);
  const result: { word: string; status: "match" | "miss" | "extra" }[] = [];
  const max = Math.max(ref.length, hyp.length);
  for (let i = 0; i < max; i++) {
    const r = ref[i], h = hyp[i];
    if (r && h) result.push({ word: r, status: r === h ? "match" : "miss" });
    else if (r && !h) result.push({ word: r, status: "miss" });
    else if (!r && h) result.push({ word: h, status: "extra" });
  }
  return result;
}
