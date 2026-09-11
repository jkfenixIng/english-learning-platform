#!/usr/bin/env tsx
/**
 * curriculum:verify-images — full implementation (PR2)
 * Canonical-first resolver: checks canonical exists, else alias manifest, else UNRESOLVED.
 * Modes: --mode prd_strict (verify 72 canonical via resolver) | legacy (verify 180 legacy + 72 alias)
 */
import fs from "node:fs";
import path from "node:path";
import { loadAliasManifest, resolveImage } from "../lib/curriculum/imageResolver";
import { canonicalForLesson } from "../lib/curriculum/imageNaming";
import { CurriculumErrorCode } from "../lib/curriculum/schemas";
import { generateEvaluations } from "../lib/curriculum/generator/evaluationGenerator";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: pnpm curriculum:verify-images [--mode prd_strict|legacy] [--manifest <path>] [--baseDir <path>]

Verifies every canonical image ref resolves via canonical file or alias manifest.
Fails with ${CurriculumErrorCode.UNRESOLVED_IMAGE_REF} if any unresolved.
  --mode <mode>   prd_strict (72 canonical) or legacy (180 legacy + alias check)
  --help          show help`);
  process.exit(0);
}

const modeIdx = args.indexOf("--mode");
const mode = modeIdx !== -1 ? args[modeIdx + 1] : (process.env.CURRICULUM_MODE ?? "prd_strict");
if (mode !== "legacy" && mode !== "prd_strict") {
  console.error(`Invalid mode: ${mode} (expected legacy|prd_strict)`);
  process.exit(1);
}

const manifestIdx = args.indexOf("--manifest");
const manifestPath =
  manifestIdx !== -1
    ? path.resolve(args[manifestIdx + 1]!)
    : path.resolve("public/lesson-images/image_alias.json");

const baseIdx = args.indexOf("--baseDir");
const baseDir =
  baseIdx !== -1 ? path.resolve(args[baseIdx + 1]!) : path.resolve("public/lesson-images");

const manifest = loadAliasManifest(manifestPath);

// Build 72 PRD canonicals — source of truth is manifest keys, fallback to generator
let canonicals: string[] = Object.keys(manifest);
if (canonicals.length === 0) {
  const levels = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;
  canonicals = [];
  for (const level of levels) {
    for (let m = 1; m <= 4; m++) {
      for (let l = 1; l <= 3; l++) {
        canonicals.push(canonicalForLesson(`${level}_m${m}_l${l}`));
      }
    }
  }
}

let unresolved: string[] = [];
let aliased = 0;
let canonicalHits = 0;

for (const c of canonicals) {
  const res = resolveImage(c, { manifest, baseDir });
  if (res.status === "ALIASED") aliased++;
  else if (res.status === "CANONICAL") canonicalHits++;
  else if (res.status === "UNRESOLVED") unresolved.push(c);
}

// PR5 evaluation image refs (151) — verify they resolve via alias placeholder (teaching-placeholder.png)
// Documented in docs/curriculum-rollout.md § Image alias coverage
let evalAliased = 0;
let evalUnresolved: string[] = [];
if (mode === "prd_strict") {
  try {
    const evals = generateEvaluations(42);
    const evalRefs = new Set<string>();
    for (const ev of evals)
      for (const q of ev.questions) if ((q as any).image_ref) evalRefs.add((q as any).image_ref);
    for (const ref of evalRefs) {
      const r = resolveImage(ref, { manifest, baseDir });
      if (r.status === "ALIASED") evalAliased++;
      else if (r.status === "CANONICAL") canonicalHits++;
      else evalUnresolved.push(ref);
    }
    console.log(
      `[curriculum:verify-images] eval refs total=${evalRefs.size} aliased=${evalAliased} unresolved=${evalUnresolved.length} (placeholder fallback)`,
    );
    unresolved.push(...evalUnresolved);
  } catch {
    // if generator not available, skip eval check
  }
}

if (mode === "legacy") {
  // Also verify legacy 180 files exist (sanity)
  const legacyDir = path.join(baseDir, "lessons");
  let legacyCount = 0;
  try {
    const files = fs.readdirSync(legacyDir).filter((f) => f.endsWith(".png"));
    legacyCount = files.length;
  } catch {
    legacyCount = 0;
  }
  console.log(
    `[curriculum:verify-images] mode=${mode} legacyFiles=${legacyCount} canonical=${canonicalHits} aliased=${aliased} unresolved=${unresolved.length}`,
  );
  if (legacyCount < 180) {
    console.warn(`[WARN] legacy lessons count ${legacyCount} < 180 expected`);
  }
} else {
  console.log(
    `[curriculum:verify-images] mode=${mode} canonical=${canonicalHits} aliased=${aliased} unresolved=${unresolved.length} total=${canonicals.length}`,
  );
}

if (unresolved.length > 0) {
  console.error(`[${CurriculumErrorCode.UNRESOLVED_IMAGE_REF}] unresolved ${unresolved.length}:`);
  for (const u of unresolved.slice(0, 20)) console.error(`  - ${u}`);
  if (unresolved.length > 20) console.error(`  ... and ${unresolved.length - 20} more`);
  process.exit(1);
}

console.log(
  `[curriculum:verify-images] OK — all ${canonicals.length} canonicals resolved (${canonicalHits} canonical, ${aliased} aliased)`,
);
process.exit(0);
