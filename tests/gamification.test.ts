import { describe, it, expect } from "vitest";
import { computeXp, levelFromXp } from "../lib/gamification/xp";
import { updateStreak } from "../lib/gamification/streak";
import { evaluateBadge } from "../lib/gamification/badges";

describe("gamification", () => {
  it("xp compute", () => {
    expect(computeXp({ difficulty: 3 })).toBe(30);
    expect(computeXp({ difficulty: 5, base: 10, timeBonus: 1.5 })).toBe(75);
  });
  it("level from xp", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
  });
  it("streak increments on consecutive day", () => {
    const s = updateStreak({ currentStreak: 2, longestStreak: 2, lastActivityDate: "2026-09-07", freezeCount: 0 }, "2026-09-08");
    expect(s.currentStreak).toBe(3);
  });
  it("streak resets after gap", () => {
    const s = updateStreak({ currentStreak: 5, longestStreak: 5, lastActivityDate: "2026-09-01", freezeCount: 0 }, "2026-09-08");
    expect(s.currentStreak).toBe(1);
  });
  it("badge evaluates streak", () => {
    expect(evaluateBadge({ type: "streak", gte: 7 }, { streak: 7 })).toBe(true);
    expect(evaluateBadge({ type: "streak", gte: 7 }, { streak: 3 })).toBe(false);
  });
});
