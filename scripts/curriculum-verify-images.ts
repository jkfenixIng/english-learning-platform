#!/usr/bin/env tsx
export {};
/**
 * Stub for `pnpm curriculum:verify-images` — PR1 only.
 * Full alias resolver and manifest check lands in PR2.
 */
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: pnpm curriculum:verify-images [--help]
  Verifies every ilustraciones_asociadas resolves via canonical or alias manifest`);
  process.exit(0);
}
console.log("[curriculum:verify-images] stub — resolver lands in PR2");
process.exit(0);
