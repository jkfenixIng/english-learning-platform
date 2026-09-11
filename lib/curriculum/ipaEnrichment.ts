import { CurriculumErrorCode, ipaRegex } from "./schemas";

// Minimal deterministic IPA dictionary (lowercased keys) — extend per pedagogy.
export const IPA_DICTIONARY: Record<string, string> = {
  hello: "/həˈloʊ/",
  hi: "/haɪ/",
  goodbye: "/ˌɡʊdˈbaɪ/",
  bye: "/baɪ/",
  please: "/pliːz/",
  thanks: "/θæŋks/",
  "thank you": "/ˌθæŋk ˈjuː/",
  yes: "/jes/",
  no: "/noʊ/",
  morning: "/ˈmɔːrnɪŋ/",
  "good morning": "/ˌɡʊd ˈmɔːrnɪŋ/",
  evening: "/ˈiːvnɪŋ/",
  night: "/naɪt/",
  friend: "/frend/",
  family: "/ˈfæməli/",
  house: "/haʊs/",
  water: "/ˈwɔːtər/",
  food: "/fuːd/",
  book: "/bʊk/",
  school: "/skuːl/",
  teacher: "/ˈtiːtʃər/",
  student: "/ˈstuːdənt/",
  love: "/lʌv/",
  help: "/help/",
  greetings: "/ˈɡriːtɪŋz/",
  welcome: "/ˈwelkəm/",
  sorry: "/ˈsɑːri/",
  "excuse me": "/ɪkˈskjuːz miː/",
  "how are you": "/ˌhaʊ ɑːr ˈjuː/",
};

export const LOW_CONFIDENCE_THRESHOLD = 0.7;
export function isValidIPA(value: string): boolean {
  return ipaRegex.test(value);
}
export function lookupIPA(word: string): { ipa: string; confidence: number } | null {
  const key = word.trim().toLowerCase();
  const hit = IPA_DICTIONARY[key];
  return hit ? { ipa: hit, confidence: 1 } : null;
}
export type VocabInput = {
  word: string;
  definition: string;
  definitionEs?: string;
  example?: string;
  exampleEs?: string;
  ipa?: string | null;
  pos?: string;
};
export type EnrichedVocab = VocabInput & { ipa: string };
export type EnrichResult = {
  item: EnrichedVocab;
  confidence: number;
  needsReview: boolean;
  reason?: string | undefined;
};
export type NeedsReviewItem = { word: string; ipa: string; confidence: number; reason: string };
function fallbackIPA(word: string): string {
  const inner = word.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 40) || "word";
  return `/${inner}/`;
}
export function enrichVocabItem(input: VocabInput): EnrichResult {
  if (typeof input.ipa === "string" && isValidIPA(input.ipa))
    return { item: { ...input, ipa: input.ipa }, confidence: 1, needsReview: false };
  const found = lookupIPA(input.word);
  if (found) {
    const needsReview = found.confidence < LOW_CONFIDENCE_THRESHOLD;
    return {
      item: { ...input, ipa: found.ipa },
      confidence: found.confidence,
      needsReview,
      reason: needsReview ? "low_confidence_dictionary" : undefined,
    };
  }
  const gen = fallbackIPA(input.word);
  return {
    item: { ...input, ipa: gen },
    confidence: 0.3,
    needsReview: true,
    reason: "fallback_generated",
  };
}
export function enrichVocabList(items: VocabInput[]): {
  enriched: EnrichedVocab[];
  needsReview: NeedsReviewItem[];
} {
  const enriched: EnrichedVocab[] = [];
  const needsReview: NeedsReviewItem[] = [];
  for (const v of items) {
    const r = enrichVocabItem(v);
    enriched.push(r.item);
    if (r.needsReview)
      needsReview.push({
        word: v.word,
        ipa: r.item.ipa,
        confidence: r.confidence,
        reason: r.reason ?? "needs_review",
      });
  }
  return { enriched, needsReview };
}
export function assertIpaRequired(items: VocabInput[], mode: "legacy" | "prd_strict"): void {
  if (mode !== "prd_strict") return;
  for (const v of items)
    if (!v.ipa || !isValidIPA(v.ipa))
      throw new Error(
        `${CurriculumErrorCode.MISSING_IPA}: word="${v.word}" missing or invalid IPA`,
      );
}
