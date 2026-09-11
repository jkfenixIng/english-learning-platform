import { enrichVocabList } from "./ipaEnrichment";
import { createSeededRng } from "./seededRng";
import { canonicalForLesson, buildCanonicalImageName } from "./imageNaming";
import type { LessonDTO } from "./schemas";
const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;
const LABEL: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
};
// themes: "en|es" per module, 4 per level pipe-separated
const THEMES: Record<string, string[]> = {
  a1: [
    "Greetings & Basics|Saludos y fundamentos",
    "Family & Home|Familia y hogar",
    "Food & Daily Life|Comida y vida diaria",
    "Routine & Time|Rutina y tiempo",
  ],
  a2: [
    "Travel & Transport|Viajes y transporte",
    "Shopping & Money|Compras y dinero",
    "Work & Health|Trabajo y salud",
    "Weather & Hobbies|Clima y aficiones",
  ],
  b1: [
    "Professional Communication|Comunicación profesional",
    "Culture & Education|Cultura y educación",
    "Environment & Tech|Medio ambiente y tecnología",
    "Society & Argument|Sociedad y argumentación",
  ],
  b2: [
    "Academic & Debate|Académico y debate",
    "Science & Arts|Ciencia y arte",
    "Global Challenges|Retos globales",
    "Leadership & Strategy|Liderazgo y estrategia",
  ],
  c1: [
    "Academic Discourse|Discurso académico",
    "Negotiation & Research|Negociación e investigación",
    "Ethics & Media|Ética y medios",
    "Innovation & Strategy|Innovación y estrategia",
  ],
  c2: [
    "Nuance & Register|Matiz y registro",
    "Mastery & Diplomacy|Dominio y diplomacia",
    "Publishing & Style|Publicación y estilo",
    "Executive Leadership|Liderazgo ejecutivo",
  ],
};
const FOCUS: Record<string, string[]> = {
  a1: [
    "Alphabet & Spelling|Numbers & Greetings|Introductions",
    "Family Members|Home & Rooms|Possessions",
    "Ordering Food|Likes & Preferences|Prices",
    "Morning Routine|Days & Time|Habits",
  ],
  a2: [
    "Airport & Hotel|Directions|Transport",
    "Markets & Prices|Clothes & Sizes|Payment",
    "Office & Emails|Health Advice|Fitness",
    "Seasons & Forecasts|Music & Film|Hobbies",
  ],
  b1: [
    "Meetings & Politeness|Emails & Deadlines|Presentations",
    "Culture & Media|Education Systems|Study Abroad",
    "Climate & Energy|Technology & Data|Social Issues",
    "Linkers & Contrast|Argument & Evidence|Conclusions",
  ],
  b2: [
    "Hedging & Stance|Counter-arguments|Nuance",
    "Hypotheses & Methods|Reviews & Critique|Heritage",
    "Conditional Solutions|Cooperation|Persuasion",
    "Vision & Motivation|Decisions & Risk|Responsibility",
  ],
  c1: [
    "Cohesion & Hedging|Clefts & Inversion|Stance",
    "Negotiation Pragmatics|Research Methods|Causation",
    "Ethics & Principles|Rhetoric & Framing|Audience",
    "Pivot & Scale|Ecosystem & Synergy|Roadmaps",
  ],
  c2: [
    "Idioms & Collocation|Formal vs Informal|Connotation",
    "Synthesis & Paradigm|Inversion & Fronting|Mitigation",
    "Abstract & Citation|Peer Review|Ethics",
    "Governance & M&A|Stakeholder Value|Execution",
  ],
};
// level base vocab 12 each, module pools are slices
const BASE_VOCAB: Record<string, string[]> = {
  a1: [
    "hello",
    "goodbye",
    "please",
    "thank you",
    "welcome",
    "introduce",
    "excuse me",
    "hi",
    "family",
    "mother",
    "father",
    "sister",
  ],
  a2: [
    "airport",
    "hotel",
    "ticket",
    "passport",
    "luggage",
    "market",
    "price",
    "clothes",
    "office",
    "meeting",
    "email",
    "health",
  ],
  b1: [
    "meeting",
    "budget",
    "deadline",
    "culture",
    "tradition",
    "environment",
    "sustainable",
    "recycle",
    "technology",
    "internet",
    "society",
    "strategy",
  ],
  b2: [
    "academic",
    "research",
    "hedge",
    "stance",
    "critical",
    "bias",
    "science",
    "hypothesis",
    "climate",
    "leadership",
    "vision",
    "strategy",
  ],
  c1: [
    "hedge",
    "cleft",
    "inversion",
    "negotiation",
    "methodology",
    "correlation",
    "dilemma",
    "persuasion",
    "disruption",
    "scalability",
    "pivot",
    "synergy",
  ],
  c2: [
    "idiom",
    "nuance",
    "register",
    "mastery",
    "mitigate",
    "epistemology",
    "publication",
    "diplomacy",
    "governance",
    "acquisition",
    "merger",
    "stakeholder",
  ],
};
function vocabFor(lvl: string, m: number) {
  const b = BASE_VOCAB[lvl]!;
  const s = (m - 1) * 3;
  return [...b.slice(s, s + 6), ...b.slice(0, 2)];
}
function wordDetail(w: string) {
  const d: Record<string, { en: string; es: string; ex: string; exEs: string }> = {
    hello: {
      en: "used to greet someone",
      es: "usado para saludar",
      ex: "Hello, nice to meet you.",
      exEs: "Hola, encantado.",
    },
    family: {
      en: "group of related people",
      es: "grupo de personas emparentadas",
      ex: "My family lives in Madrid.",
      exEs: "Mi familia vive en Madrid.",
    },
  };
  return (
    d[w.toLowerCase()] ?? {
      en: `related to ${w}`,
      es: `relacionado con ${w}`,
      ex: `We discussed ${w} in class.`,
      exEs: `Hablamos de ${w} en clase.`,
    }
  );
}
export function generateLessons(seed: number): LessonDTO[] {
  const rng = createSeededRng(seed);
  const lessons: LessonDTO[] = [];
  for (const lvl of LEVELS) {
    for (let m = 1; m <= 4; m++) {
      const [enRaw, esRaw] = THEMES[lvl]![m - 1]!.split("|");
      const theme = { en: enRaw!, es: esRaw! };
      const focuses = FOCUS[lvl]![m - 1]!.split("|");
      const pool = vocabFor(lvl, m);
      for (let l = 1; l <= 3; l++) {
        const id = `${lvl}_m${m}_l${l}`;
        const focus = focuses[l - 1] ?? `Lesson ${l}`;
        const tituloEn = `${LABEL[lvl]} M${m} L${l}: ${focus}`;
        const tituloEs = `${LABEL[lvl]} M${m} L${l}: ${focus} (${theme.es})`;
        const objetivo = `Learn ${focus.toLowerCase()} in the context of ${theme.en.toLowerCase()}: master key words and apply them in real situations.`;
        const explicacion = `Focus: ${focus}. Theme: ${theme.en}. Grammar and vocabulary for ${theme.en.toLowerCase()} with examples using ${pool.slice(0, 3).join(", ")}. Practice aloud, then use in context.`;
        const vocabCount = rng.nextInt(3, 8);
        const shuffled = rng.shuffle(pool);
        let words = shuffled.slice(0, Math.min(vocabCount, shuffled.length));
        while (words.length < vocabCount) words.push(pool[words.length % pool.length]!);
        const vocabInputs = words.map((w) => {
          const d = wordDetail(w);
          return {
            word: w,
            definition: d.en,
            definitionEs: d.es,
            example: d.ex,
            exampleEs: d.exEs,
          };
        });
        const { enriched } = enrichVocabList(vocabInputs);
        const vocabulario_clave = enriched.map((v) => ({
          word: v.word,
          definition: v.definition,
          definitionEs: v.definitionEs,
          example: v.example,
          exampleEs: v.exampleEs,
          ipa: v.ipa,
          pos: (v.pos as string | undefined) ?? undefined,
        }));
        const imgCount = rng.nextInt(1, 3);
        const ilustraciones: string[] = [canonicalForLesson(id)];
        if (imgCount >= 2)
          ilustraciones.push(
            buildCanonicalImageName({
              level: lvl,
              module: m,
              kind: "img",
              descriptor: `vocab_${l}`,
            }),
          );
        if (imgCount >= 3)
          ilustraciones.push(
            buildCanonicalImageName({
              level: lvl,
              module: m,
              kind: "ill",
              descriptor: `scene_${l}`,
            }),
          );
        lessons.push({
          id_leccion: id,
          titulo: { en: tituloEn, es: tituloEs },
          objetivo: objetivo.slice(0, 300),
          explicacion_gramatical:
            explicacion.length >= 20 ? explicacion : explicacion + " Extended explanation.",
          vocabulario_clave,
          ilustraciones_asociadas: [...new Set(ilustraciones)].slice(0, 3),
          moduleId: `${lvl}_m${m}`,
        });
      }
    }
  }
  return lessons;
}
export const lessonGenerator = generateLessons;
export default generateLessons;
