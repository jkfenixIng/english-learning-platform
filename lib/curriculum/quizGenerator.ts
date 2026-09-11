import fs from "node:fs";
import path from "node:path";
import { createSeededRng, type SeededRng } from "./seededRng";
import { canonicalForLesson } from "./imageNaming";
import type { LessonDTO, QuizDTO } from "./schemas";
export type QuizQuestion = QuizDTO["questions"][number];
function buildQ(
  lesson: LessonDTO,
  idx: number,
  type: "multiple_choice" | "fill_blank" | "visual",
  rng: SeededRng,
): QuizQuestion {
  const id = `${lesson.id_leccion}_q${idx + 1}`;
  const words = lesson.vocabulario_clave.map((v) => v.word);
  const w = rng.pick(words);
  if (type === "multiple_choice") {
    const d = rng.shuffle(words.filter((x) => x !== w)).slice(0, 3);
    return {
      id,
      type,
      prompt: `Choose the correct word for "${w}": ${lesson.titulo.en}`,
      options: rng.shuffle([w, ...d]),
      answer: w,
    };
  }
  if (type === "fill_blank")
    return {
      id,
      type,
      prompt: `Fill the blank: "We discussed ___ in ${lesson.titulo.en}." (${w})`,
      answer: w,
    };
  const image_ref =
    lesson.ilustraciones_asociadas[0] ??
    canonicalForLesson(lesson.id_leccion, "img", `q${idx + 1}`);
  return { id, type, prompt: `Look at the image and choose "${w}"`, image_ref, answer: w };
}
function dist(rng: SeededRng): ("multiple_choice" | "fill_blank" | "visual")[] {
  return rng.shuffle([
    "multiple_choice",
    "multiple_choice",
    "fill_blank",
    "fill_blank",
    "visual",
  ] as const) as any;
}
export function generateQuizzes(lessons: LessonDTO[], seed: number): QuizDTO[] {
  const rng = createSeededRng(seed);
  const out: QuizDTO[] = [];
  for (const lesson of lessons) {
    const lvl = lesson.id_leccion.split("_")[0]!;
    const isBC = lvl.startsWith("b") || lvl.startsWith("c");
    const tentative = isBC ? rng.nextInt(5, 7) : 5;
    let types: ("multiple_choice" | "fill_blank" | "visual")[] =
      tentative === 5
        ? dist(rng)
        : (() => {
            const b = dist(rng);
            const a = [...b];
            for (let i = 5; i < tentative; i++)
              a.push(rng.pick(["multiple_choice", "fill_blank", "visual"] as const) as any);
            return rng.shuffle(a);
          })();
    let qs = types.map((t, i) => buildQ(lesson, i, t, rng));
    if (qs.length > 5) {
      const dropped = qs.slice(5);
      console.log(
        `[quarantine] ${lesson.id_leccion} truncated ${qs.length}->5 dropped=${dropped.map((q) => q.id).join(",")}`,
      );
      try {
        const dir = path.resolve("quarantine");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, `quiz-${lesson.id_leccion}-${seed}.json`),
          JSON.stringify({ lessonId: lesson.id_leccion, dropped }, null, 2),
        );
      } catch {}
      qs = qs.slice(0, 5);
      const hasV = qs.some((q) => q.type === "visual"),
        hasM = qs.some((q) => q.type === "multiple_choice"),
        hasF = qs.some((q) => q.type === "fill_blank");
      if (!hasV || !hasM || !hasF) {
        if (!hasV) qs[0] = buildQ(lesson, 0, "visual", rng);
        if (!hasM) qs[1] = buildQ(lesson, 1, "multiple_choice", rng);
        if (!hasF) qs[2] = buildQ(lesson, 2, "fill_blank", rng);
      }
    }
    qs = qs.slice(0, 5);
    if (new Set(qs.map((q) => q.type)).size < 3) {
      const f = dist(rng);
      qs = f.map((t, i) => buildQ(lesson, i, t, rng));
    }
    out.push({ lessonId: lesson.id_leccion, questions: qs as QuizDTO["questions"] });
  }
  return out;
}
export const quizGenerator = generateQuizzes;
export default generateQuizzes;
