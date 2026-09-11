#!/usr/bin/env tsx
export {};
/**
 * Stub for `pnpm curriculum:validate` — PR1 only.
 * Validates JSON Schema and Zod alignment; full generation validation lands in PR4/PR5.
 * Usage: pnpm curriculum:validate --mode prd_strict | --help
 */
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: pnpm curriculum:validate [--mode prd_strict|legacy]
  Validates curriculum artifacts against schemas/curriculum.prd.json and lib/curriculum/schemas.ts
  Flags:
    --mode <mode>   curriculum mode (default: legacy)
    --help          show this help`);
  process.exit(0);
}

const modeIdx = args.indexOf("--mode");
const mode = modeIdx !== -1 ? args[modeIdx + 1] : (process.env.CURRICULUM_MODE ?? "legacy");

if (mode !== "legacy" && mode !== "prd_strict") {
  console.error(`Invalid mode: ${mode} (expected legacy|prd_strict)`);
  process.exit(1);
}

// PR1 stub — schema files exist check
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.resolve("schemas/curriculum.prd.json");
const zodPath = path.resolve("lib/curriculum/schemas.ts");

if (!fs.existsSync(schemaPath)) {
  console.error(`Missing ${schemaPath}`);
  process.exit(1);
}
if (!fs.existsSync(zodPath)) {
  console.error(`Missing ${zodPath}`);
  process.exit(1);
}

console.log(`[curriculum:validate] mode=${mode} — schemas present (stub, full validation in PR4)`);
process.exit(0);
