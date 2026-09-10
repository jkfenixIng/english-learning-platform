#!/usr/bin/env tsx
export {};
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: pnpm curriculum:generate [--mode prd_strict|legacy] [--seed 42]`);
  process.exit(0);
}
console.log("[curriculum:generate] stub — generator lands in PR4/PR5");
process.exit(0);
