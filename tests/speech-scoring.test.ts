import { describe, it, expect } from "vitest";
import { scorePronunciation } from "../lib/speech/scoring";

describe("speech scoring", () => {
  it("perfect match 100", () => {
    const r = scorePronunciation("hello world", "hello world");
    expect(r.overall).toBe(100);
    expect(r.wer).toBe(0);
  });
  it("one word wrong", () => {
    const r = scorePronunciation("hello world", "hello word");
    expect(r.overall).toBeLessThan(100);
    expect(r.wordScores[1]?.matched).toBe(false);
  });
  it("empty transcript", () => {
    const r = scorePronunciation("hello world", "");
    expect(r.overall).toBeLessThan(50);
  });
});
