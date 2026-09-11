import { describe, it, expect, afterEach } from "vitest";
import {
  getCurriculumMode,
  isPrdStrict,
  parseCurriculumMode,
  getCurriculumMeta,
} from "../lib/curriculum/config";

describe("curriculum config", () => {
  const orig = process.env.CURRICULUM_MODE;
  afterEach(() => {
    if (orig === undefined) delete process.env.CURRICULUM_MODE;
    else process.env.CURRICULUM_MODE = orig;
  });

  it("defaults to legacy when env unset", () => {
    delete process.env.CURRICULUM_MODE;
    expect(getCurriculumMode()).toBe("legacy");
    expect(isPrdStrict()).toBe(false);
  });

  it("returns prd_strict when env set", () => {
    process.env.CURRICULUM_MODE = "prd_strict";
    expect(getCurriculumMode()).toBe("prd_strict");
    expect(isPrdStrict()).toBe(true);
  });

  it("parse falls back for invalid value", () => {
    expect(parseCurriculumMode("invalid")).toBe("legacy");
    expect(parseCurriculumMode(null)).toBe("legacy");
    expect(getCurriculumMode("bad")).toBe("legacy");
  });

  it("explicit param overrides env", () => {
    process.env.CURRICULUM_MODE = "legacy";
    expect(getCurriculumMode("prd_strict")).toBe("prd_strict");
    expect(isPrdStrict("prd_strict")).toBe(true);
  });

  it("getCurriculumMeta exposes mode", () => {
    expect(getCurriculumMeta("prd_strict")).toEqual({
      mode: "prd_strict",
      isPrdStrict: true,
      isLegacy: false,
    });
    expect(getCurriculumMeta("legacy").isLegacy).toBe(true);
  });
});
