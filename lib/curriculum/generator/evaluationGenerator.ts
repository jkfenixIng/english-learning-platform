import { createSeededRng } from "../seededRng";
import { buildCanonicalImageName } from "../imageNaming";
import type { EvaluationDTO } from "../schemas";
import { assertEvaluationDistribution } from "../schemas";

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;
const READING = ["comprehension", "graded_reading"] as const;
const GRAMMAR = ["fill_blanks", "matching", "transformation", "multiple_choice"] as const;
const LISTENING = ["listening_tts", "dictation", "shadowing", "pronunciation"] as const;

function imgFor(level: string, mod: number, slot: number) {
  return buildCanonicalImageName({
    level,
    module: mod,
    kind: "img",
    descriptor: `eval_r${slot + 1}`,
  });
}
function audioImgFor(level: string, mod: number, slot: number) {
  return buildCanonicalImageName({
    level,
    module: mod,
    kind: "audio",
    descriptor: `eval_l${slot + 1}`,
  });
}

export function generateEvaluations(seed: number): EvaluationDTO[] {
  const rng = createSeededRng(seed);
  const out: EvaluationDTO[] = [];
  for (const lvl of LEVELS) {
    for (let m = 1; m <= 4; m++) {
      const moduleId = `${lvl}_m${m}`;
      const qs: EvaluationDTO["questions"] = [];
      let slot = 0;
      // reading 4
      for (let i = 0; i < 4; i++) {
        const type = rng.pick([...READING]);
        const id = `${moduleId}_eval_q${slot + 1}`;
        const prompt = `Reading ${i + 1} for ${moduleId}: ${type} passage — answer based on text.`;
        qs.push({
          id,
          category: "reading",
          type,
          prompt,
          answer: "A",
          image_ref: imgFor(lvl, m, slot),
          evaluationSlot: slot,
        });
        slot++;
      }
      // grammar_vocab 6
      for (let i = 0; i < 6; i++) {
        const type = rng.pick([...GRAMMAR]);
        const id = `${moduleId}_eval_q${slot + 1}`;
        const prompt = `Grammar/Vocab ${i + 1} for ${moduleId}: ${type} — choose the correct form.`;
        qs.push({ id, category: "grammar_vocab", type, prompt, answer: "A", evaluationSlot: slot });
        slot++;
      }
      // listening 5
      for (let i = 0; i < 5; i++) {
        const type = rng.pick([...LISTENING]);
        const id = `${moduleId}_eval_q${slot + 1}`;
        const prompt = `Listening ${i + 1} for ${moduleId}: ${type} — listen and respond.`;
        // listening_tts/shadowing/pronunciation benefit from canonical refs; add for two types
        const needImg =
          type === "listening_tts" || type === "pronunciation"
            ? audioImgFor(lvl, m, slot)
            : undefined;
        qs.push({
          id,
          category: "listening",
          type,
          prompt,
          answer: "A",
          ...(needImg ? { image_ref: needImg } : {}),
          evaluationSlot: slot,
        });
        slot++;
      }
      const shuffled = rng.shuffle(qs);
      // reassign evaluationSlot after shuffle to keep 0..14 contiguous per spec order
      shuffled.forEach((q, idx) => (q.evaluationSlot = idx));
      // re-sort by slot for deterministic storage but distribution preserved; shuffle then re-slot is deterministic
      // verify distribution
      assertEvaluationDistribution(shuffled);
      // sort back by slot for stable output (slot already 0..14)
      shuffled.sort((a, b) => (a.evaluationSlot ?? 0) - (b.evaluationSlot ?? 0));
      out.push({ moduleId, questions: shuffled as EvaluationDTO["questions"] });
    }
  }
  return out;
}
export const evaluationGenerator = generateEvaluations;
export default generateEvaluations;
