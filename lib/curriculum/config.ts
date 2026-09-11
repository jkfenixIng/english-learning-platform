export type CurriculumMode = "legacy" | "prd_strict";

export const CURRICULUM_MODES = ["legacy", "prd_strict"] as const;

const DEFAULT_MODE: CurriculumMode = "legacy";

export function parseCurriculumMode(value: string | undefined | null): CurriculumMode {
  if (value === "prd_strict" || value === "legacy") return value;
  return DEFAULT_MODE;
}

export function getCurriculumMode(envValue?: string | undefined | null): CurriculumMode {
  const raw = envValue ?? process.env.CURRICULUM_MODE;
  return parseCurriculumMode(raw);
}

export function isPrdStrict(envValue?: string | undefined | null): boolean {
  return getCurriculumMode(envValue) === "prd_strict";
}

export function getCurriculumMeta(envValue?: string | undefined | null) {
  const mode = getCurriculumMode(envValue);
  return {
    mode,
    isPrdStrict: mode === "prd_strict",
    isLegacy: mode === "legacy",
  };
}
