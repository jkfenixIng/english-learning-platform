import { describe, it, expect } from "vitest";
import {
  enrichVocabItem,
  enrichVocabList,
  lookupIPA,
  isValidIPA,
  IPA_DICTIONARY,
  LOW_CONFIDENCE_THRESHOLD,
  assertIpaRequired,
} from "../lib/curriculum/ipaEnrichment";
import {
  VocabWithIPASchema,
  VocabLegacySchema,
  LessonSchema,
  LessonLegacySchema,
  validateVocabIPAForMode,
  assertVocabIPAForMode,
  CurriculumErrorCode,
  ipaRegex,
} from "../lib/curriculum/schemas";

describe("REQ-LES-002 IPA enrichment and validation", () => {
  it("IPA regex: /həˈloʊ/ passes, hello and empty slashes fail", () => {
    expect(ipaRegex.test("/həˈloʊ/")).toBe(true);
    expect(isValidIPA("/həˈloʊ/")).toBe(true);
    expect(ipaRegex.test("hello")).toBe(false);
    expect(isValidIPA("hello")).toBe(false);
    expect(ipaRegex.test("//")).toBe(false);
    expect(ipaRegex.test("/ /")).toBe(true); // at least one char inside delimiters
    expect(
      VocabWithIPASchema.safeParse({ word: "hello", definition: "greeting", ipa: "/həˈloʊ/" })
        .success,
    ).toBe(true);
    expect(
      VocabWithIPASchema.safeParse({ word: "hello", definition: "greeting", ipa: "hello" }).success,
    ).toBe(false);
  });

  it("dictionary lookup: known word confidence 1, unknown returns null", () => {
    expect(IPA_DICTIONARY["hello"]).toBe("/həˈloʊ/");
    expect(lookupIPA("hello")).toEqual({ ipa: "/həˈloʊ/", confidence: 1 });
    expect(lookupIPA("HELLO")?.ipa).toBe("/həˈloʊ/"); // case-insensitive
    expect(lookupIPA("foobar")).toBeNull();
  });

  it("enrichVocabItem keeps valid existing IPA with high confidence", () => {
    const r = enrichVocabItem({ word: "hello", definition: "greeting", ipa: "/həˈloʊ/" });
    expect(r.item.ipa).toBe("/həˈloʊ/");
    expect(r.confidence).toBe(1);
    expect(r.needsReview).toBe(false);
  });

  it("enrichVocabItem with missing IPA and known word uses dictionary (confidence 1)", () => {
    const r = enrichVocabItem({ word: "please", definition: "polite word" });
    expect(r.item.ipa).toBe("/pliːz/");
    expect(r.confidence).toBe(1);
    expect(r.needsReview).toBe(false);
  });

  it("enrichVocabItem fallback for unknown word is low-confidence needs_review", () => {
    const r = enrichVocabItem({ word: "foobar", definition: "unknown" });
    expect(r.item.ipa).toBe("/foobar/");
    expect(ipaRegex.test(r.item.ipa)).toBe(true);
    expect(r.confidence).toBe(0.3);
    expect(r.needsReview).toBe(true);
    expect(r.reason).toBe("fallback_generated");
    expect(r.confidence).toBeLessThan(LOW_CONFIDENCE_THRESHOLD);
  });

  it("enrichVocabItem with invalid IPA triggers dictionary or fallback", () => {
    const r = enrichVocabItem({ word: "hello", definition: "g", ipa: "hello" });
    // "hello" is known, so should resolve to dictionary despite invalid input ipa
    expect(r.item.ipa).toBe("/həˈloʊ/");
  });

  it("enrichVocabList batches and builds needs_review queue", () => {
    const { enriched, needsReview } = enrichVocabList([
      { word: "hello", definition: "greeting" }, // dict hit
      { word: "foobar", definition: "unknown" }, // fallback
      { word: "please", definition: "polite", ipa: "/pliːz/" }, // already valid
    ]);
    expect(enriched.length).toBe(3);
    expect(enriched[0]!.ipa).toBe("/həˈloʊ/");
    expect(enriched[1]!.ipa).toBe("/foobar/");
    expect(needsReview.length).toBe(1);
    expect(needsReview[0]!.word).toBe("foobar");
    expect(needsReview[0]!.reason).toBe("fallback_generated");
  });

  it("assertIpaRequired throws MISSING_IPA in prd_strict when IPA missing, not in legacy", () => {
    expect(() =>
      assertIpaRequired([{ word: "hello", definition: "g", ipa: null }], "prd_strict"),
    ).toThrow(CurriculumErrorCode.MISSING_IPA);
    expect(() =>
      assertIpaRequired([{ word: "hello", definition: "g", ipa: "hello" }], "prd_strict"),
    ).toThrow(CurriculumErrorCode.MISSING_IPA);
    expect(() =>
      assertIpaRequired([{ word: "hello", definition: "g", ipa: null }], "legacy"),
    ).not.toThrow();
    expect(() =>
      assertIpaRequired([{ word: "hello", definition: "g", ipa: "/haɪ/" }], "prd_strict"),
    ).not.toThrow();
  });

  it("validateVocabIPAForMode helper reports errors in strict, valid in legacy", () => {
    const strict = validateVocabIPAForMode([{ word: "hi", ipa: null }], "prd_strict");
    expect(strict.valid).toBe(false);
    expect(strict.errors[0]).toContain(CurriculumErrorCode.MISSING_IPA);
    const legacy = validateVocabIPAForMode([{ word: "hi", ipa: null }], "legacy");
    expect(legacy.valid).toBe(true);
    expect(() => assertVocabIPAForMode([{ word: "hi", ipa: null }], "prd_strict")).toThrow();
    expect(() => assertVocabIPAForMode([{ word: "hi", ipa: "/haɪ/" }], "prd_strict")).not.toThrow();
  });

  it("VocabWithIPA strict requires ipa matching /^/.+/$/, legacy allows null/undefined", () => {
    expect(VocabWithIPASchema.safeParse({ word: "hi", definition: "hi" }).success).toBe(false);
    expect(VocabLegacySchema.safeParse({ word: "hi", definition: "hi", ipa: null }).success).toBe(
      true,
    );
    expect(VocabLegacySchema.safeParse({ word: "hi", definition: "hi" }).success).toBe(true);
    expect(VocabLegacySchema.safeParse({ word: "hi", definition: "hi", ipa: "hi" }).success).toBe(
      false,
    );
    expect(
      VocabLegacySchema.safeParse({ word: "hi", definition: "hi", ipa: "/haɪ/" }).success,
    ).toBe(true);
  });

  it("Lesson strict requires vocab 3-8 with IPA, legacy allows missing", () => {
    const base = {
      id_leccion: "a1_m1_l1",
      titulo: { en: "Greetings", es: "Saludos" },
      objetivo: "Learn to greet people in everyday situations",
      explicacion_gramatical:
        "Use hello and hi to greet; good morning is more formal in the morning.",
      ilustraciones_asociadas: ["a1_m1_img_greetings.png"],
    };
    const withIPA = [
      { word: "hello", definition: "greeting", ipa: "/həˈloʊ/" },
      { word: "please", definition: "polite", ipa: "/pliːz/" },
      { word: "hi", definition: "hi", ipa: "/haɪ/" },
    ];
    expect(LessonSchema.safeParse({ ...base, vocabulario_clave: withIPA }).success).toBe(true);
    expect(
      LessonSchema.safeParse({ ...base, vocabulario_clave: [{ word: "hello", definition: "g" }] })
        .success,
    ).toBe(false);
    // legacy allows null IPA
    expect(
      LessonLegacySchema.safeParse({
        ...base,
        vocabulario_clave: [
          { word: "hello", definition: "g", ipa: null },
          { word: "please", definition: "p", ipa: null },
          { word: "hi", definition: "h" },
        ],
      }).success,
    ).toBe(true);
  });

  it("enrichVocabList respects confidence threshold for needs_review", () => {
    const { needsReview } = enrichVocabList([
      { word: "hello", definition: "g" },
      { word: "unknownword", definition: "x" },
    ]);
    // hello is dict hit confidence 1 > threshold, unknown is 0.3 < threshold
    expect(needsReview.some((r) => r.word === "unknownword")).toBe(true);
    expect(needsReview.some((r) => r.word === "hello")).toBe(false);
  });
});
