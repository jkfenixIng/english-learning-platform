import type { LessonContent, LessonContentBlock, LessonKind } from "./types";

// ---------------------------------------------------------------------------
// Level meta dictionaries (mirrors prisma/seed LEVEL_META but i18n-aware)
// No DB migration needed; these translate DB titles when locale is es.
// ---------------------------------------------------------------------------
export const LEVEL_TITLES_ES: Record<string, string> = {
  A1: "Principiante (A1)",
  A2: "Elemental (A2)",
  B1: "Intermedio (B1)",
  B2: "Intermedio Alto (B2)",
  C1: "Avanzado (C1)",
  C2: "Dominio (C2)",
};

export const LEVEL_DESCRIPTIONS_ES: Record<string, string> = {
  A1: "MCER A1 — Principiante",
  A2: "MCER A2 — Elemental",
  B1: "MCER B1 — Intermedio",
  B2: "MCER B2 — Intermedio Alto",
  C1: "MCER C1 — Avanzado académico y profesional",
  C2: "MCER C2 — Dominio y matices",
};

export const UNIT_NAMES_ES: Record<string, string[]> = {
  A1: ["Fundamentos", "Saludos", "Familia", "Comida y bebida", "Hogar", "Rutina diaria"],
  A2: [
    "Viajes",
    "Compras",
    "Trabajo básico",
    "Salud y forma física",
    "Clima y estaciones",
    "Aficiones",
  ],
  B1: [
    "Comunicación profesional",
    "Cultura y medios",
    "Educación y aprendizaje",
    "Medio ambiente",
    "Tecnología",
    "Cuestiones sociales",
  ],
  B2: [
    "Negocios y academia",
    "Pensamiento crítico",
    "Ciencia e innovación",
    "Arte y cultura",
    "Retos globales",
    "Liderazgo",
  ],
  C1: [
    "Discurso académico",
    "Negociación profesional",
    "Métodos de investigación",
    "Ética y filosofía",
    "Medios y persuasión",
    "Innovación y estrategia",
  ],
  C2: [
    "Matices, modismos y registro",
    "Dominio e investigación",
    "Estilística avanzada",
    "Diplomacia intercultural",
    "Publicación académica",
    "Liderazgo ejecutivo",
  ],
};

export const UNIT_NAMES_EN: Record<string, string[]> = {
  A1: ["Basics", "Greetings", "Family", "Food & Drink", "Home", "Daily Routine"],
  A2: ["Travel", "Shopping", "Work Basics", "Health & Fitness", "Weather & Seasons", "Hobbies"],
  B1: [
    "Professional Communication",
    "Culture & Media",
    "Education & Learning",
    "Environment",
    "Technology",
    "Social Issues",
  ],
  B2: [
    "Academic & Business",
    "Critical Thinking",
    "Science & Innovation",
    "Arts & Culture",
    "Global Challenges",
    "Leadership",
  ],
  C1: [
    "Academic Discourse",
    "Professional Negotiation",
    "Research Methods",
    "Ethics & Philosophy",
    "Media & Persuasion",
    "Innovation & Strategy",
  ],
  C2: [
    "Nuance, Idioms & Register",
    "Mastery & Research",
    "Advanced Stylistics",
    "Cross-cultural Diplomacy",
    "Academic Publishing",
    "Executive Leadership",
  ],
};

// Intro paragraphs per level — EN/ES pair (kept in sync with prisma/seed)
export const INTRO_EN: Record<string, string> = {
  A1: "Everyday English for real situations — greetings, introductions, and simple descriptions.",
  A2: "Build confidence for travel and work: asking for help, describing routines, and making plans.",
  B1: "Professional communication — meetings, emails, and culture topics with richer vocabulary.",
  B2: "Academic and business English — argument structure, hedging, and critical thinking.",
  C1: "Advanced discourse — stance, cohesion, and negotiation strategies at academic/professional level.",
  C2: "Mastery — nuance, register, idioms, and research-grade writing and speaking.",
};

export const INTRO_ES: Record<string, string> = {
  A1: "Inglés cotidiano para situaciones reales: saludos, presentaciones y descripciones sencillas.",
  A2: "Gana confianza para viajar y trabajar: pedir ayuda, describir rutinas y hacer planes.",
  B1: "Comunicación profesional: reuniones, correos y temas culturales con vocabulario más rico.",
  B2: "Inglés académico y de negocios: estructura argumentativa, matización y pensamiento crítico.",
  C1: "Discurso avanzado: postura, cohesión y estrategias de negociación en contexto académico y profesional.",
  C2: "Dominio total: matices, registro, modismos y escritura y habla a nivel de investigación.",
};

// Cover image per level (local, no picsum)
export function coverForLevel(levelCode: string): string {
  const c = levelCode.toLowerCase();
  if (["a1", "a2", "b1", "b2", "c1", "c2"].includes(c)) return `/lesson-images/level-${c}.png`;
  return "/lesson-images/teaching-placeholder.png";
}

// ---------------------------------------------------------------------------
// Title helpers — translate DB strings when locale is es, fallback to DB
// ---------------------------------------------------------------------------
export function getLevelTitle(code: string, locale: string, dbTitle?: string): string {
  if (locale === "es" && LEVEL_TITLES_ES[code]) return LEVEL_TITLES_ES[code]!;
  return dbTitle ?? code;
}

export function getLevelDescription(code: string, locale: string, dbDesc?: string): string {
  if (locale === "es" && LEVEL_DESCRIPTIONS_ES[code]) return LEVEL_DESCRIPTIONS_ES[code]!;
  return dbDesc ?? "";
}

export function getUnitTitle(rawTitle: string, locale: string): string {
  if (locale !== "es") return rawTitle;
  // Pattern: "A1 Unit 1: Basics" or "A1 Final Exam"
  const finalExam = rawTitle.match(/^([A-C][12])\s+Final Exam$/i);
  if (finalExam) return `${finalExam[1]!.toUpperCase()} Examen final`;
  const m = rawTitle.match(/^([A-C][12])\s+Unit\s+(\d+):\s*(.*)$/i);
  if (!m) return rawTitle;
  const code = m[1]!.toUpperCase();
  const idx = parseInt(m[2]!, 10);
  const esNames = UNIT_NAMES_ES[code];
  if (!esNames || idx < 1 || idx > esNames.length) return rawTitle;
  return `${code} Unidad ${idx}: ${esNames[idx - 1]}`;
}

export function getUnitDescription(rawDesc: string, locale: string): string {
  if (locale !== "es") return rawDesc;
  // "Unit 1 for A1" -> "Unidad 1 de A1"
  const m = rawDesc.match(/^Unit\s+(\d+)\s+for\s+([A-C][12])$/i);
  if (m) return `Unidad ${m[1]} de ${m[2]!.toUpperCase()}`;
  const exam = rawDesc.match(/^Final exam for\s+([A-C][12])$/i);
  if (exam) return `Examen final de ${exam[1]!.toUpperCase()}`;
  return rawDesc;
}

export function getLessonTitle(rawTitle: string, locale: string): string {
  if (locale !== "es") return rawTitle;
  if (/Final Exam/i.test(rawTitle)) {
    const code = rawTitle.match(/^([A-C][12])/)?.[1]?.toUpperCase();
    return code ? `${code} Examen final` : "Examen final";
  }
  const m = rawTitle.match(/^Lesson\s+(\d+)(.*)$/i);
  if (!m) return rawTitle;
  const n = m[1];
  const suffix = m[2] ?? "";
  const suffixEs = suffix.replace(/—\s*Quiz/i, "— Cuestionario").replace(/Quiz/i, "Cuestionario");
  return `Lección ${n}${suffixEs}`;
}

export function getLessonObjectives(raw: string, locale: string): string {
  if (locale !== "es") return raw;
  const m = raw.match(/^Objectives for\s+([A-C][12])\s+U(\d+)\s+L(\d+)$/i);
  if (m) return `Objetivos para ${m[1]!.toUpperCase()} U${m[2]} L${m[3]}`;
  if (/Comprehensive exam for/i.test(raw)) {
    const code = raw.match(/for\s+([A-C][12])/i)?.[1]?.toUpperCase();
    return code ? `Examen integral de ${code}` : "Examen integral";
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Lesson kinds
// ---------------------------------------------------------------------------
export function getLessonKindLabel(kind: LessonKind, locale: string): string {
  const es: Record<LessonKind, string> = {
    teach: "Aprender",
    practice: "Práctica",
    quiz: "Cuestionario",
    exam: "Examen",
  };
  const en: Record<LessonKind, string> = {
    teach: "Learn",
    practice: "Practice",
    quiz: "Quiz",
    exam: "Exam",
  };
  if (locale === "es") return es[kind] ?? kind;
  return en[kind] ?? kind;
}

// ---------------------------------------------------------------------------
// Block localization — uses bilingual fields when present, falls back to
// static dictionaries so old DB rows without textEs still render ES.
// ---------------------------------------------------------------------------
const CALLOUT_EN =
  "Tip: read the content first, then hit “Practice” to try short exercises. Quizzes and exams come last.";
const CALLOUT_ES =
  "Consejo: lee el contenido primero y luego pulsa “Practicar” para hacer ejercicios breves. Los cuestionarios y exámenes van al final.";

const EXAMPLE_TITLE_EN = "Example in context";
const EXAMPLE_TITLE_ES = "Ejemplo en contexto";

// Map EN intro -> ES for fallback when block lacks textEs
const INTRO_EN_TO_ES = new Map<string, string>(
  Object.entries(INTRO_EN).map(([k, v]) => [v, INTRO_ES[k] ?? v]),
);

// Vocab definition fallback EN -> ES
const VOCAB_FALLBACK: Record<string, string> = {
  "something you want to achieve": "algo que quieres lograr",
  "repeated exercise to improve": "ejercicio repetido para mejorar",
  silent: "silencioso",
  mixed: "mixto",
  "not simultaneous": "no simultáneo",
  "to soften a claim": "suavizar una afirmación",
  "a syntax that foregrounds part of a clause, e.g., What matters is X":
    "sintaxis que destaca una parte de la cláusula, ej. Lo que importa es X",
  "reversal of normal word order for emphasis": "inversión del orden normal para dar énfasis",
  "to set an initial reference point": "establecer un punto de referencia inicial",
  "mutual exchange": "intercambio mutuo",
  "to make less severe": "hacer menos grave",
};

export function localizeBlock(block: LessonContentBlock, locale: string): LessonContentBlock {
  if (locale !== "es") return block;
  switch (block.type) {
    case "heading": {
      const b = block as Extract<LessonContentBlock, { type: "heading" }>;
      const textEs = (b as unknown as { textEs?: string }).textEs;
      if (textEs) return { ...b, text: textEs };
      // try to translate "A1 · A1 Unit 1: Basics — Lesson 1" pattern
      let t = b.text;
      t = t.replace(/Unit\s+(\d+):\s*/gi, "Unidad $1: ");
      t = t.replace(/Lesson\s+(\d+)/gi, "Lección $1");
      // also translate unit names inside heading if known (now 6 per level)
      for (const code of Object.keys(UNIT_NAMES_EN)) {
        const enArr = UNIT_NAMES_EN[code]!;
        const esArr = UNIT_NAMES_ES[code]!;
        for (let i = 0; i < enArr.length; i++) {
          const en = enArr[i]!;
          const es = esArr[i]!;
          if (t.includes(en)) t = t.replace(en, es);
        }
      }
      if (t !== b.text) return { ...b, text: t };
      return b;
    }
    case "paragraph": {
      const b = block as Extract<LessonContentBlock, { type: "paragraph" }>;
      const textEs = (b as unknown as { textEs?: string }).textEs;
      if (textEs) return { ...b, text: textEs };
      const mapped = INTRO_EN_TO_ES.get(b.text);
      if (mapped) return { ...b, text: mapped };
      return b;
    }
    case "image": {
      const b = block as Extract<LessonContentBlock, { type: "image" }>;
      const altEs = (b as unknown as { altEs?: string }).altEs;
      const captionEs = (b as unknown as { captionEs?: string }).captionEs;
      const out: LessonContentBlock = { ...b };
      if (altEs) (out as unknown as Record<string, unknown>).alt = altEs;
      if (captionEs) (out as unknown as Record<string, unknown>).caption = captionEs;
      // generic fallback captions should not leak English when ES
      if (!captionEs && b.caption === "Illustrative image — adds context to the topic") {
        (out as unknown as Record<string, unknown>).caption =
          "Imagen ilustrativa — aporta contexto al tema";
      }
      return out;
    }
    case "vocab": {
      const b = block as Extract<LessonContentBlock, { type: "vocab" }>;
      return {
        ...b,
        items: b.items.map((it) => {
          const ext = it as unknown as { definitionEs?: string; exampleEs?: string };
          const def =
            locale === "es"
              ? (ext.definitionEs ?? VOCAB_FALLBACK[it.definition] ?? it.definition)
              : it.definition;
          return { ...it, definition: def };
        }),
      };
    }
    case "example": {
      const b = block as Extract<LessonContentBlock, { type: "example" }>;
      const titleEs = (b as unknown as { titleEs?: string }).titleEs;
      if (titleEs || b.title === EXAMPLE_TITLE_EN) {
        return { ...b, title: titleEs ?? EXAMPLE_TITLE_ES };
      }
      return b;
    }
    case "callout": {
      const b = block as Extract<LessonContentBlock, { type: "callout" }>;
      const textEs = (b as unknown as { textEs?: string }).textEs;
      if (textEs) return { ...b, text: textEs };
      if (b.text === CALLOUT_EN) return { ...b, text: CALLOUT_ES };
      return b;
    }
    case "list": {
      const lb = block as Extract<LessonContentBlock, { type: "list" }>;
      const itemsEs = (lb as unknown as { itemsEs?: string[] }).itemsEs;
      if (itemsEs && itemsEs.length === lb.items.length) return { ...lb, items: itemsEs };
      return block;
    }
    case "video": {
      const vb = block as Extract<LessonContentBlock, { type: "video" }>;
      const ext = vb as unknown as { titleEs?: string; captionEs?: string };
      const out: LessonContentBlock = { ...vb };
      if (ext.titleEs) (out as unknown as Record<string, unknown>).title = ext.titleEs;
      if (ext.captionEs) (out as unknown as Record<string, unknown>).caption = ext.captionEs;
      return out;
    }
    default:
      return block;
  }
}

export function localizeContent(
  content: LessonContent | null,
  locale: string,
): LessonContent | null {
  if (!content || locale !== "es") return content;
  return { blocks: content.blocks.map((b) => localizeBlock(b, locale)) };
}
