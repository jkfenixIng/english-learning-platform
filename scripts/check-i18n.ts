import * as fs from "fs";
import * as path from "path";

const en = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages/en/common.json"), "utf-8"));
const es = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages/es/common.json"), "utf-8"));

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" && v !== null ? keys(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k) : [prefix ? `${prefix}.${k}` : k]));
}

const enKeys = new Set(keys(en));
const esKeys = new Set(keys(es));
const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));
const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));

if (missingInEs.length || missingInEn.length) {
  if (missingInEs.length) console.error("Missing in es:", missingInEs);
  if (missingInEn.length) console.error("Missing in en:", missingInEn);
  process.exit(1);
}
console.log("i18n check passed");
