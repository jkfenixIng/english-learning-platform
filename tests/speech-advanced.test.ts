import { describe, it, expect } from "vitest";
import { scorePronunciation, diffWords, getPronunciationFeedback, wer } from "../lib/speech/scoring";

describe("speech advanced scoring", () => {
  it("phoneme heuristic penalizes missing th", () => {
    const s1 = scorePronunciation("think", "tink");
    const s2 = scorePronunciation("think", "think");
    expect(s1.overall).toBeLessThan(s2.overall);
  });

  it("diffWords marks match/miss/extra", () => {
    const diff = diffWords("Could you elaborate", "Could you elaborate");
    expect(diff.every((d) => d.status === "match")).toBe(true);
    const diff2 = diffWords("Could you elaborate", "Could you");
    expect(diff2.find((d) => d.word === "elaborate")?.status).toBe("miss");
    const diff3 = diffWords("hello", "hello world");
    expect(diff3.some((d) => d.status === "extra")).toBe(true);
  });

  it("getPronunciationFeedback returns hint for low score", () => {
    const fb = getPronunciationFeedback("think thoroughly", "tink toroughly");
    expect(fb).toMatch(/th|Try rounding/i);
    const ok = getPronunciationFeedback("hello", "hello");
    expect(ok).toBeNull();
  });

  it("WER calculates correctly", () => {
    expect(wer("hello world", "hello world")).toBe(0);
    expect(wer("hello world", "hello")).toBeCloseTo(0.5);
  });

  it("scorePronunciation handles empty reference", () => {
    const s = scorePronunciation("", "hello");
    expect(s.overall).toBe(0);
  });
});
