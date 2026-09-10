#!/usr/bin/env tsx
export {};
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: pnpm curriculum:audit [--mode prd_strict|legacy]`);
  process.exit(0);
}
console.log("[curriculum:audit] stub — audit lands in PR5");
process.exit(0);
