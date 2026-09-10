import { describe, it, expect, vi } from "vitest";
import {
  buildCanonicalImageName,
  isValidCanonicalImageName,
  parseCanonicalImageName,
  canonicalForLesson,
  canonicalImageRegex,
  legacyPathForCanonical,
} from "../lib/curriculum/imageNaming";
import {
  resolveImage,
  loadAliasManifest,
  resolveImageUrl,
  resolveImages,
} from "../lib/curriculum/imageResolver";
import fs from "node:fs";
import path from "node:path";

describe("imageNaming canonical builder / regex", () => {
  it("canonical passes, legacy/upper fails (REQ-IMG-001)", () => {
    expect(isValidCanonicalImageName("a1_m1_img_greetings.png")).toBe(true);
    expect(isValidCanonicalImageName("a1_m1_img_l1.png")).toBe(true);
    expect(isValidCanonicalImageName("c2_m4_ill_final_review.png")).toBe(true);
    expect(isValidCanonicalImageName("c2_m4_audio_dialog_1.png")).toBe(true);
    expect(isValidCanonicalImageName("lessons/a1-u1-l1.png")).toBe(false);
    expect(isValidCanonicalImageName("A1_M1_IMG_GREETINGS.PNG")).toBe(false);
    expect(isValidCanonicalImageName("LESSONS/A1-U1-L1.PNG")).toBe(false);
    expect(isValidCanonicalImageName("a1_m5_img_x.png")).toBe(false); // m5 invalid
    expect(isValidCanonicalImageName("d1_m1_img_x.png")).toBe(false);
  });

  it("buildCanonical lowercases and validates", () => {
    expect(
      buildCanonicalImageName({ level: "A1", module: 1, kind: "img", descriptor: "Greetings" }),
    ).toBe("a1_m1_img_greetings.png");
    expect(() =>
      buildCanonicalImageName({ level: "a1", module: 5, kind: "img", descriptor: "x" }),
    ).toThrow();
  });

  it("parseCanonicalImageName round-trips", () => {
    const parts = parseCanonicalImageName("b1_m2_audio_dialog_1.png");
    expect(parts).toEqual({ level: "b1", module: 2, kind: "audio", descriptor: "dialog_1" });
    expect(parseCanonicalImageName("lessons/a1-u1-l1.png")).toBe(null);
    expect(parseCanonicalImageName("A1_M1_IMG_X.PNG")).toBe(null);
  });

  it("canonicalForLesson maps a1_m1_l1 -> a1_m1_img_l1 (default) and custom descriptor", () => {
    expect(canonicalForLesson("a1_m1_l1")).toBe("a1_m1_img_l1.png");
    expect(canonicalForLesson("c2_m4_l3")).toBe("c2_m4_img_l3.png");
    expect(canonicalForLesson("a1_m1_l1", "img", "greetings")).toBe("a1_m1_img_greetings.png");
    expect(canonicalForLesson("B1_M2_L2", "ill", "final_review")).toBe(
      "b1_m2_ill_final_review.png",
    );
    expect(() => canonicalForLesson("A1-M1-L1")).toThrow();
  });

  it("legacyPathForCanonical heuristic", () => {
    expect(legacyPathForCanonical("a1_m1_img_l1.png")).toBe("lessons/a1-u1-l1.png");
    expect(legacyPathForCanonical("a1_m1_img_greetings.png")).toBe("lessons/a1-u1-l1.png");
    expect(legacyPathForCanonical("invalid.png")).toBe(null);
  });

  it("regex matches spec exactly", () => {
    expect(canonicalImageRegex.source).toBe("^[a-c][12]_m[1-4]_(img|audio|ill)_[a-z0-9_]+\\.png$");
  });
});

describe("imageResolver canonical-first alias fallback", () => {
  const manifest: Record<string, string> = {
    "a1_m1_img_greetings.png": "lessons/a1-u1-l1.png",
    "a1_m1_img_l1.png": "lessons/a1-u1-l1.png",
    "c2_m4_img_l3.png": "lessons/c2-u4-l3.png",
  };

  it("returns CANONICAL when canonical file exists", () => {
    const existsSync = (p: string) => p.endsWith("a1_m1_img_greetings.png");
    const res = resolveImage("a1_m1_img_greetings.png", { manifest, existsSync, baseDir: "/base" });
    expect(res.status).toBe("CANONICAL");
    expect(res.resolvedPath).toBe("/lesson-images/a1_m1_img_greetings.png");
  });

  it("ALIASED when canonical missing but alias legacy exists (logs ALIASED)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const existsSync = (p: string) => p.replace(/\\/g, "/").endsWith("lessons/a1-u1-l1.png");
    const res = resolveImage("a1_m1_img_greetings.png", { manifest, existsSync, baseDir: "/base" });
    expect(res.status).toBe("ALIASED");
    expect(res.resolvedPath).toBe("/lesson-images/lessons/a1-u1-l1.png");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[ALIASED]"));
    spy.mockRestore();
  });

  it("UNRESOLVED when neither canonical nor alias exists (logs UNRESOLVED)", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const existsSync = () => false;
    const res = resolveImage("a1_m1_img_greetings.png", { manifest, existsSync, baseDir: "/base" });
    expect(res.status).toBe("UNRESOLVED");
    expect(res.resolvedPath).toBe(null);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[UNRESOLVED]"));
    spy.mockRestore();
  });

  it("UNRESOLVED for invalid canonical name form", () => {
    const res = resolveImage("LESSONS/A1-U1-L1.PNG", {
      manifest,
      existsSync: () => true,
      baseDir: "/base",
    });
    expect(res.status).toBe("UNRESOLVED");
  });

  it("resolveImages batch and resolveImageUrl helper", () => {
    const existsSync = (p: string) => p.replace(/\\/g, "/").endsWith("lessons/a1-u1-l1.png");
    const batch = resolveImages(["a1_m1_img_l1.png", "a1_m1_img_greetings.png"], {
      manifest,
      existsSync,
      baseDir: "/base",
    });
    expect(batch).toHaveLength(2);
    expect(batch.every((r) => r.status === "ALIASED")).toBe(true);
    expect(resolveImageUrl("a1_m1_img_greetings.png", manifest)).toBe(
      "/lesson-images/lessons/a1-u1-l1.png",
    );
    expect(resolveImageUrl("a1_m1_img_unknown.png", {})).toBe(
      "/lesson-images/a1_m1_img_unknown.png",
    );
    expect(resolveImageUrl("bad.png", {})).toBe("/lesson-images/teaching-placeholder.png");
  });

  it("loadAliasManifest reads real manifest (72 entries) and covers 180 legacy count shape", () => {
    const m = loadAliasManifest(path.resolve("public/lesson-images/image_alias.json"));
    expect(Object.keys(m)).toHaveLength(72);
    // every value is lessons/{level}-u{module}-l{lesson}.png
    for (const [k, v] of Object.entries(m)) {
      expect(isValidCanonicalImageName(k)).toBe(true);
      expect(v).toMatch(/^lessons\/[a-c][12]-u[1-4]-l[1-3]\.png$/);
    }
  });

  it("180 legacy fixtures exist on disk (if seeded)", () => {
    const base = path.resolve("public/lesson-images");
    const lessonsDir = path.join(base, "lessons");
    if (!fs.existsSync(lessonsDir)) return;
    const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith(".png"));
    // accept >=180 (legacy 6x6x5 =180, plus future) but at least 180 present in repo
    expect(files.length).toBeGreaterThanOrEqual(180);
    // spot check a few alias targets actually exist (the 72 mapped ones)
    const manifest = loadAliasManifest();
    for (const legacy of Object.values(manifest).slice(0, 5)) {
      expect(fs.existsSync(path.join(base, legacy))).toBe(true);
    }
  });

  it("verify 72 canonicals all resolve via alias in current repo (canonical files not yet created)", () => {
    const manifest = loadAliasManifest();
    const base = path.resolve("public/lesson-images");
    const canonicals = Object.keys(manifest);
    const results = resolveImages(canonicals, { manifest, baseDir: base });
    const unresolved = results.filter((r) => r.status === "UNRESOLVED");
    expect(unresolved).toHaveLength(0);
    // all should be ALIASED currently (no canonical files on disk yet)
    expect(results.every((r) => r.status === "ALIASED" || r.status === "CANONICAL")).toBe(true);
  });
});
