import { describe, it, expect } from "vitest";
import { review, createInitialCard, isDue, qualityFromScore } from "../lib/srs/sm2";

describe("sm2", () => {
  it("initial card has defaults", () => {
    const c = createInitialCard("2026-09-08");
    expect(c.easeFactor).toBe(2.5); expect(c.interval).toBe(0); expect(c.repetitions).toBe(0);
  });
  it("quality 5 first review -> interval 1, repetitions 1", () => {
    const c = createInitialCard("2026-09-08");
    const n = review(c, 5, "2026-09-08");
    expect(n.interval).toBe(1); expect(n.repetitions).toBe(1); expect(n.dueDate).toBe("2026-09-09");
  });
  it("second good review -> interval 6", () => {
    let c = createInitialCard("2026-09-08");
    c = review(c, 5, "2026-09-08");
    c = review(c, 5, "2026-09-09");
    expect(c.interval).toBe(6); expect(c.repetitions).toBe(2);
  });
  it("third good review -> interval = round(6 * ease)", () => {
    let c = createInitialCard("2026-09-08");
    c = review(c, 5, "2026-09-08"); // ef 2.6
    c = review(c, 5, "2026-09-09"); // ef 2.7 interval 6
    const beforeEase = c.easeFactor;
    c = review(c, 5, "2026-09-15");
    expect(c.interval).toBe(Math.round(6 * beforeEase));
  });
  it("quality <3 resets repetitions and lapses++", () => {
    let c = createInitialCard("2026-09-08");
    c = review(c, 5, "2026-09-08"); expect(c.repetitions).toBe(1);
    c = review(c, 2, "2026-09-09");
    expect(c.repetitions).toBe(0); expect(c.lapses).toBe(1); expect(c.interval).toBe(1);
  });
  it("ease factor floors at 1.3", () => {
    let c = { interval: 10, easeFactor: 1.4, repetitions: 5, dueDate: "2026-09-08", lapses: 0 };
    c = review(c, 0, "2026-09-08");
    expect(c.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
  it("isDue true when dueDate <= today", () => {
    expect(isDue({ interval:1, easeFactor:2.5, repetitions:1, dueDate:"2026-09-07", lapses:0 }, "2026-09-08")).toBe(true);
    expect(isDue({ interval:1, easeFactor:2.5, repetitions:1, dueDate:"2026-09-09", lapses:0 }, "2026-09-08")).toBe(false);
  });
  it("qualityFromScore mapping", () => {
    expect(qualityFromScore(100)).toBe(5); expect(qualityFromScore(85)).toBe(4); expect(qualityFromScore(65)).toBe(3); expect(qualityFromScore(40)).toBe(2); expect(qualityFromScore(10)).toBe(1); expect(qualityFromScore(0)).toBe(0);
  });
  it("throws on invalid quality", () => {
    expect(() => review(createInitialCard("2026-09-08"), 6, "2026-09-08")).toThrow();
  });
});
