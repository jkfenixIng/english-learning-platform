import { imageRefRegex } from "./schemas";

/** Canonical image regex — single source, mirrors schemas/curriculum.prd.json#ImageRef */
export const canonicalImageRegex = imageRefRegex;

export type CanonicalImageKind = "img" | "audio" | "ill";

export interface CanonicalImageParts {
  level: string; // a1..c2
  module: number; // 1..4
  kind: CanonicalImageKind;
  descriptor: string; // [a-z0-9_]+
}

const PARSE_RE = /^([a-c][12])_m([1-4])_(img|audio|ill)_([a-z0-9_]+)\.png$/;

/** Build canonical name: [nivel]_[modulo]_[tipo]_[descriptor].png */
export function buildCanonicalImageName(args: {
  level: string;
  module: number | string;
  kind: CanonicalImageKind;
  descriptor: string;
}): string {
  const level = String(args.level).toLowerCase();
  const moduleNum = Number(args.module);
  const descriptor = String(args.descriptor).toLowerCase();
  const kind = args.kind;
  const name = `${level}_m${moduleNum}_${kind}_${descriptor}.png`;
  if (!canonicalImageRegex.test(name)) {
    throw new Error(`INVALID_CANONICAL_IMAGE: ${name}`);
  }
  return name;
}

export function isValidCanonicalImageName(name: string): boolean {
  return canonicalImageRegex.test(name);
}

export function parseCanonicalImageName(name: string): CanonicalImageParts | null {
  const m = PARSE_RE.exec(name);
  if (!m) return null;
  return {
    level: m[1]!,
    module: Number(m[2]!),
    kind: m[3]! as CanonicalImageKind,
    descriptor: m[4]!,
  };
}

/**
 * Helper: derive canonical image name from PRD lesson id.
 * a1_m1_l1 -> a1_m1_img_{descriptor}.png
 * Default descriptor = lesson suffix (l1..l3) so every PRD lesson maps 1:1.
 */
export function canonicalForLesson(
  lessonId: string,
  kind: CanonicalImageKind = "img",
  descriptor?: string,
): string {
  const id = lessonId.toLowerCase();
  const lessonRe = /^([a-c][12])_m([1-4])_l[1-3]$/;
  const m = lessonRe.exec(id);
  if (!m) throw new Error(`INVALID_LESSON_ID: ${lessonId}`);
  const level = m[1]!;
  const moduleNum = Number(id.split("_m")[1]!.split("_")[0]!);
  // fallback: use module parsed from regex group properly
  const modMatch = /^([a-c][12])_m([1-4])_/.exec(id);
  const mod = modMatch ? Number(modMatch[2]!) : moduleNum;
  const suffix = descriptor ?? id.split("_").at(-1)!; // l1 / l2 / l3 or custom
  const safeDescriptor = suffix.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return buildCanonicalImageName({ level, module: mod, kind, descriptor: safeDescriptor });
}

/** Legacy helper: map canonical -> expected legacy path suffix for reference */
export function legacyPathForCanonical(canonical: string): string | null {
  const parts = parseCanonicalImageName(canonical);
  if (!parts) return null;
  // legacy format lessons/{level}-u{module}-l{lessonDerived}.png
  // descriptor l1..l3 maps heuristically; custom descriptors fallback to l1
  const lessonNum = /^l[1-3]$/.test(parts.descriptor) ? parts.descriptor.slice(1) : "1";
  return `lessons/${parts.level}-u${parts.module}-l${lessonNum}.png`;
}
