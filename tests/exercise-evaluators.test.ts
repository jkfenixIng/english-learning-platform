import { describe, it, expect } from "vitest";
import { evaluateFillBlanks } from "../lib/exercises/plugins/fill-blanks/evaluator";
import { evaluateOrdering } from "../lib/exercises/plugins/ordering/evaluator";
import { evaluateDictation } from "../lib/exercises/plugins/dictation/evaluator";
import { evaluateMatching } from "../lib/exercises/plugins/matching/evaluator";
import { evaluateComprehension } from "../lib/exercises/plugins/comprehension/evaluator";

describe("evaluators", () => {
  it("fill_blanks correct", () => {
    const res = evaluateFillBlanks({ text: "She ___", blanks: [{ id: "b1" }] }, { answers: { b1: ["went"] } }, { answers: { b1: "went" } });
    expect(res.score).toBe(100);
  });
  it("fill_blanks wrong", () => {
    const res = evaluateFillBlanks({ text: "She ___", blanks: [{ id: "b1" }] }, { answers: { b1: ["went"] } }, { answers: { b1: "go" } });
    expect(res.score).toBe(0);
  });
  it("ordering perfect", () => {
    const res = evaluateOrdering({}, { order: ["a", "b", "c"] }, { order: ["a", "b", "c"] });
    expect(res.score).toBe(100);
  });
  it("ordering partial", () => {
    const res = evaluateOrdering({}, { order: ["a", "b", "c"] }, { order: ["a", "c", "b"] });
    expect(res.score).toBe(33);
  });
  it("dictation tolerant", () => {
    const res = evaluateDictation({}, { text: "I like English" }, { text: "i like english" });
    expect(res.score).toBe(100);
  });
  it("matching all correct", () => {
    const res = evaluateMatching({}, { pairs: [{ id: "1", left: "cat", right: "gato" }] }, { matches: { cat: "gato" } });
    expect(res.score).toBe(100);
  });
  it("comprehension wrong", () => {
    const res = evaluateComprehension({}, { answer: "London" }, { answer: "Paris" });
    expect(res.score).toBe(0);
  });
});
