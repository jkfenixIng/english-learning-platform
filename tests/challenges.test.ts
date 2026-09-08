import { describe, it, expect } from "vitest";
import { isChallengeActive, progressForRule, isExpired, defaultChallengeWindows } from "../lib/challenges/rules";

describe("challenges rules", () => {
  it("isChallengeActive within window", () => {
    const start = new Date("2026-09-08T00:00:00Z"), end = new Date("2026-09-09T00:00:00Z");
    expect(isChallengeActive(start, end, new Date("2026-09-08T12:00:00Z"))).toBe(true);
    expect(isChallengeActive(start, end, new Date("2026-09-10T00:00:00Z"))).toBe(false);
  });
  it("progressForRule computes completion", () => {
    expect(progressForRule({ metric: "exercises", count: 5 }, { exercises: 3 }).completed).toBe(false);
    expect(progressForRule({ metric: "exercises", count: 5 }, { exercises: 5 }).completed).toBe(true);
    expect(progressForRule({ metric: "xp", count: 100 }, { xp: 120 }).completed).toBe(true);
    expect(progressForRule({ metric: "streak", count: 3 }, { streak: 3 }).completed).toBe(true);
  });
  it("isExpired", () => {
    expect(isExpired(new Date("2026-01-01"), new Date("2026-09-08"))).toBe(true);
    expect(isExpired(new Date("2027-01-01"), new Date("2026-09-08"))).toBe(false);
  });
  it("default windows daily = 24h", () => {
    const { startAt, endAt } = defaultChallengeWindows("daily", new Date("2026-09-08T10:00:00Z"));
    expect(endAt.getTime() - startAt.getTime()).toBeGreaterThan(23*3600*1000);
  });
  it("weekly window spans 7 days", () => {
    const { startAt, endAt } = defaultChallengeWindows("weekly", new Date("2026-09-08T10:00:00Z"));
    const diff = (endAt.getTime() - startAt.getTime())/ (1000*3600*24);
    expect(diff).toBeGreaterThan(6);
  });
});
