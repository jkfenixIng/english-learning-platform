#!/usr/bin/env tsx
/** Backfill IPA for vocab — dictionary + fallback, logs low-confidence for manual review. */
import { enrichVocabList, LOW_CONFIDENCE_THRESHOLD } from "../lib/curriculum/ipaEnrichment";
import { getCurriculumMode } from "../lib/curriculum/config";
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    `Usage: pnpm curriculum:backfill-ipa [--dry-run] [--mode prd_strict|legacy]\n  --dry-run  do not write to DB, log what would change\n  --mode     curriculum mode (default: prd_strict)`,
  );
  process.exit(0);
}
const dryRun = args.includes("--dry-run");
const modeIdx = args.indexOf("--mode");
const modeArg = modeIdx !== -1 ? args[modeIdx + 1] : undefined;
const mode = (modeArg === "legacy" || modeArg === "prd_strict" ? modeArg : getCurriculumMode()) as
  "legacy" | "prd_strict";
async function run() {
  console.log(`[backfill-ipa] mode=${mode} dryRun=${dryRun}`);
  let lessons: { id: string; title: string; content: unknown }[] = [];
  let prisma: any = null,
    prismaClient: any = null;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const client = new PrismaClient();
    prismaClient = client;
    prisma = client;
    lessons = (await prisma.lesson.findMany({
      select: { id: true, title: true, content: true },
    })) as typeof lessons;
  } catch (e) {
    console.warn(`[backfill-ipa] DB unavailable (${(e as Error).message}); demo mode`);
    lessons = [
      {
        id: "demo-lesson",
        title: "Demo",
        content: {
          blocks: [
            {
              type: "vocab",
              items: [
                { word: "hello", definition: "greeting", ipa: null },
                { word: "foobar", definition: "unknown" },
                { word: "please", definition: "polite", ipa: "/pliːz/" },
              ],
            },
          ],
        },
      },
    ];
  }
  let totalVocab = 0,
    enrichedCount = 0;
  const needsReviewQueue: {
    word: string;
    ipa: string;
    confidence: number;
    reason: string;
    lessonId: string;
  }[] = [];
  for (const lesson of lessons) {
    const content = lesson.content as {
      blocks?: {
        type: string;
        items?: { word: string; definition: string; ipa?: string | null }[];
      }[];
    } | null;
    if (!content?.blocks) continue;
    let dirty = false;
    for (const block of content.blocks) {
      if (block.type !== "vocab" || !block.items) continue;
      totalVocab += block.items.length;
      const { enriched, needsReview } = enrichVocabList(block.items);
      for (let i = 0; i < block.items.length; i++) {
        if (block.items[i]!.ipa !== enriched[i]!.ipa) {
          dirty = true;
          enrichedCount++;
          block.items[i] = enriched[i]!;
        }
      }
      for (const nr of needsReview)
        if (nr.confidence < LOW_CONFIDENCE_THRESHOLD) {
          needsReviewQueue.push({ ...nr, lessonId: lesson.id });
          console.warn(
            `[backfill-ipa] needs_review: word="${nr.word}" ipa="${nr.ipa}" conf=${nr.confidence} reason=${nr.reason} lesson=${lesson.id}`,
          );
        }
    }
    if (dirty && !dryRun && prisma) {
      try {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { content: content as object },
        });
        console.log(`[backfill-ipa] updated ${lesson.id}`);
      } catch (e) {
        console.error(`[backfill-ipa] update failed ${lesson.id}: ${(e as Error).message}`);
      }
    } else if (dirty && dryRun)
      console.log(`[backfill-ipa] dry-run would update ${lesson.id} (${lesson.title})`);
  }
  console.log(
    `[backfill-ipa] summary: lessons=${lessons.length} vocab=${totalVocab} enriched=${enrichedCount} needs_review=${needsReviewQueue.length} dryRun=${dryRun}`,
  );
  if (needsReviewQueue.length) {
    console.log(`[backfill-ipa] manual review queue (${needsReviewQueue.length}):`);
    for (const q of needsReviewQueue)
      console.log(`  - ${q.word} -> ${q.ipa} (conf ${q.confidence}, ${q.reason}) [${q.lessonId}]`);
  }
  if (prismaClient) await prismaClient.$disconnect();
  if (dryRun) console.log(`[backfill-ipa] dry-run complete — no writes`);
}
run().catch((e) => {
  console.error(`[backfill-ipa] error: ${(e as Error).message}`);
  process.exit(1);
});
