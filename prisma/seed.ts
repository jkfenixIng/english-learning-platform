import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Helpers for new Lesson model (kind/content/coverImage) — no breaking change, fallback to isQuiz/isExam if DB not migrated
function picsum(seed: string, w = 600, h = 340): string {
  const safe = seed.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `https://picsum.photos/seed/${safe}/${w}/${h}`;
}

function lessonKindFor(li: number, isExam: boolean): "teach" | "quiz" | "exam" {
  if (isExam) return "exam";
  if (li === 3) return "quiz";
  return "teach";
}

function buildLessonContent(
  levelCode: string,
  unitTitle: string,
  li: number,
): { blocks: unknown[] } {
  const intro: Record<string, string> = {
    A1: "Everyday English for real situations — greetings, introductions, and simple descriptions.",
    A2: "Build confidence for travel and work: asking for help, describing routines, and making plans.",
    B1: "Professional communication — meetings, emails, and culture topics with richer vocabulary.",
    B2: "Academic and business English — argument structure, hedging, and critical thinking.",
    C1: "Advanced discourse — stance, cohesion, and negotiation strategies at academic/professional level.",
    C2: "Mastery — nuance, register, idioms, and research-grade writing and speaking.",
  };
  const seed = `${levelCode}-content-${li}`;
  return {
    blocks: [
      { type: "heading", text: `${levelCode} · ${unitTitle} — Lesson ${li}`, level: 2 },
      { type: "paragraph", text: intro[levelCode] ?? intro["A1"]! },
      {
        type: "image",
        url: picsum(seed, 800, 450),
        alt: `${levelCode} lesson illustration`,
        caption: "Illustrative image — adds context to the topic",
      },
      {
        type: "vocab",
        items: [
          {
            word: "goal",
            definition: "something you want to achieve",
            example: "My goal is to speak fluently.",
          },
          {
            word: "practice",
            definition: "repeated exercise to improve",
            example: "Daily practice builds confidence.",
          },
        ],
      },
      {
        type: "example",
        title: "Example in context",
        text: levelCode.startsWith("C")
          ? "What the lesson shows is not just grammar but how form encodes stance — use clefts and inversion to guide attention."
          : "She practices English every morning before work. It helps her remember new words.",
        translation: "She practices English every morning.",
      },
      {
        type: "callout",
        text: "Tip: read the content first, then hit “Practice” to try short exercises. Quizzes and exams come last.",
        variant: "tip",
      },
    ],
  };
}

// Templates spanning all 13 types, Zod-validated via exercise plugins on write path
const EXERCISE_TEMPLATES: {
  type: string;
  prompt: unknown;
  solution: unknown;
  difficulty: number;
}[] = [
  {
    type: "fill_blanks",
    prompt: { text: "She ___ (go) yesterday.", blanks: [{ id: "b1", hint: "past of go" }] },
    solution: { answers: { b1: ["went"] } },
    difficulty: 1,
  },
  {
    type: "ordering",
    prompt: { tokens: ["she", "went", "yesterday", "to", "school"] },
    solution: { order: ["she", "went", "yesterday", "to", "school"] },
    difficulty: 1,
  },
  {
    type: "transformation",
    prompt: { instruction: "Make negative", sentence: "She is happy." },
    solution: { accepted: ["She is not happy.", "She isn't happy."] },
    difficulty: 2,
  },
  {
    type: "flashcard",
    prompt: {
      front: "apple",
      back: "manzana",
      imageUrl: picsum("flashcard-apple", 300, 200),
    },
    solution: { back: "manzana" },
    difficulty: 1,
  },
  {
    type: "matching",
    prompt: {
      pairs: [
        { id: "1", left: "cat", right: "gato" },
        { id: "2", left: "dog", right: "perro" },
      ],
    },
    solution: {
      pairs: [
        { id: "1", left: "cat", right: "gato" },
        { id: "2", left: "dog", right: "perro" },
      ],
    },
    difficulty: 1,
  },
  {
    type: "listening_tts",
    prompt: {
      text: "Hello, how are you today?",
      question: "What did you hear?",
      options: ["Hello, how are you today?", "Goodbye"],
    },
    solution: { answer: "Hello, how are you today?" },
    difficulty: 1,
  },
  {
    type: "dictation",
    prompt: { text: "I like learning English", playsAllowed: 2 },
    solution: { text: "I like learning English" },
    difficulty: 2,
  },
  {
    type: "comprehension",
    prompt: {
      passage: "Lena lives in London. She works at a cafe.",
      question: "Where does Lena live?",
      options: ["London", "Paris", "Berlin"],
    },
    solution: { answer: "London" },
    difficulty: 1,
  },
  {
    type: "graded_reading",
    prompt: {
      title: "A Day at the Park",
      passage:
        "Tom goes to the park every Sunday. He likes to read under a tree. The park is quiet and green.",
      vocab: [{ word: "quiet", definition: "silent" }],
      questions: [
        { id: "q1", question: "Where does Tom go?", options: ["Park", "School"], answer: "Park" },
        { id: "q2", question: "When?", options: ["Sunday", "Monday"], answer: "Sunday" },
      ],
    },
    solution: { answers: { q1: "Park", q2: "Sunday" } },
    difficulty: 2,
  },
  {
    type: "writing_prompt",
    prompt: { prompt: "Describe your weekend (30-50 words)", minWords: 10, maxWords: 100 },
    solution: { sampleAnswer: "I had a great weekend. I visited my family and went to the park." },
    difficulty: 2,
  },
  {
    type: "speaking_record",
    prompt: { text: "Hello, my name is Anna.", instruction: "Introduce yourself" },
    solution: { reference: "Hello, my name is Anna." },
    difficulty: 1,
  },
  {
    type: "shadowing",
    prompt: { reference: "Could you elaborate?", speed: 1 },
    solution: { reference: "Could you elaborate?" },
    difficulty: 2,
  },
  {
    type: "pronunciation",
    prompt: {
      word: "pronunciation",
      phonetic: "/prəˌnʌnsiˈeɪʃən/",
      example: "Good pronunciation is important.",
    },
    solution: { word: "pronunciation" },
    difficulty: 2,
  },
];

// B-level heavier templates: longer readings, professional contexts
const B_TEMPLATES: typeof EXERCISE_TEMPLATES = [
  {
    type: "fill_blanks",
    prompt: {
      text: "If she ___ (study) harder, she would have passed.",
      blanks: [{ id: "b1", hint: "past conditional" }],
    },
    solution: { answers: { b1: ["had studied"] } },
    difficulty: 3,
  },
  {
    type: "ordering",
    prompt: { tokens: ["had", "I", "known", "earlier", "would", "come"] },
    solution: { order: ["had", "I", "known", "earlier", "would", "come"] },
    difficulty: 3,
  },
  {
    type: "transformation",
    prompt: {
      instruction: "Rewrite in passive: The team completed the project.",
      sentence: "The team completed the project.",
    },
    solution: { accepted: ["The project was completed by the team."] },
    difficulty: 3,
  },
  {
    type: "flashcard",
    prompt: {
      front: "sustainable",
      back: "sostenible",
      imageUrl: picsum("flashcard-sustainable", 300, 200),
    },
    solution: { back: "sostenible" },
    difficulty: 3,
  },
  {
    type: "matching",
    prompt: {
      pairs: [
        { id: "1", left: "deadline", right: "fecha limite" },
        { id: "2", left: "budget", right: "presupuesto" },
      ],
    },
    solution: {
      pairs: [
        { id: "1", left: "deadline", right: "fecha limite" },
        { id: "2", left: "budget", right: "presupuesto" },
      ],
    },
    difficulty: 3,
  },
  {
    type: "listening_tts",
    prompt: {
      text: "Could you please elaborate on the quarterly results and forecast?",
      question: "What was requested?",
      options: ["Elaborate on results", "Cancel meeting"],
    },
    solution: { answer: "Elaborate on results" },
    difficulty: 3,
  },
  {
    type: "dictation",
    prompt: {
      text: "The presentation was postponed due to unforeseen circumstances",
      playsAllowed: 2,
    },
    solution: { text: "The presentation was postponed due to unforeseen circumstances" },
    difficulty: 3,
  },
  {
    type: "comprehension",
    prompt: {
      passage:
        "Despite the economic downturn, the company maintained growth by diversifying its portfolio.",
      question: "How did the company maintain growth?",
      options: ["Diversifying portfolio", "Cutting staff"],
    },
    solution: { answer: "Diversifying portfolio" },
    difficulty: 3,
  },
  {
    type: "graded_reading",
    prompt: {
      title: "The Future of Remote Work",
      passage:
        "Remote work has fundamentally reshaped professional life. In 2020, companies scrambled to adapt; by 2026, hybrid models dominate. Studies show productivity remained stable, but collaboration requires intentional design. Successful teams set clear async norms, document decisions, and protect focus time. The challenge is not technology but culture.",
      vocab: [
        { word: "hybrid", definition: "mixed" },
        { word: "async", definition: "not simultaneous" },
      ],
      questions: [
        {
          id: "q1",
          question: "When did remote work surge?",
          options: ["2020", "2015"],
          answer: "2020",
        },
        {
          id: "q2",
          question: "Main challenge?",
          options: ["Culture", "Laptops"],
          answer: "Culture",
        },
      ],
    },
    solution: { answers: { q1: "2020", q2: "Culture" } },
    difficulty: 4,
  },
  {
    type: "writing_prompt",
    prompt: {
      prompt: "Discuss advantages and disadvantages of remote work (120-150 words)",
      minWords: 80,
      maxWords: 200,
    },
    solution: { sampleAnswer: "Remote work offers flexibility but requires discipline..." },
    difficulty: 4,
  },
  {
    type: "speaking_record",
    prompt: {
      text: "I would like to present our quarterly performance and outlook.",
      instruction: "Present the quarterly overview",
    },
    solution: { reference: "I would like to present our quarterly performance and outlook." },
    difficulty: 3,
  },
  {
    type: "shadowing",
    prompt: { reference: "We need to align on the deliverables before the deadline.", speed: 1 },
    solution: { reference: "We need to align on the deliverables before the deadline." },
    difficulty: 3,
  },
  {
    type: "pronunciation",
    prompt: {
      word: "entrepreneur",
      phonetic: "/ˌɒntrəprəˈnɜː/",
      example: "She is a successful entrepreneur.",
    },
    solution: { word: "entrepreneur" },
    difficulty: 4,
  },
];

// C-level academic/professional + long-form readings ~400-600 words, advanced grammar (inversion/cleft)
const C_READING_ACADEMIC = `Academic writing at the C1-C2 threshold demands more than grammatical accuracy; it requires rhetorical control and an awareness of how linguistic choices encode stance. In contemporary research articles, writers hedge claims with devices such as modal verbs, tentative adverbs, and reporting clauses to acknowledge the provisional nature of knowledge. Not only do these hedges signal intellectual humility, but they also invite dialogue rather than imposing certainty. It is the precision of the claim, not its boldness, that persuades a disciplinary audience. Consider the cleft structure "What the study reveals is not causation but correlation": the syntax foregrounds the contrast, guiding the reader toward the intended interpretation. Similarly, inversion serves a cohesive function — "Never before has replication been so central to credibility" — placing the evaluative frame first and linking the sentence to a broader argument about the replication crisis. Such structures are not ornamental; they choreograph attention. Professional negotiation, moreover, relies on parallel pragmatics. A negotiator rarely states "We cannot accept that price." Instead, one frames interests: "What we need is flexibility on delivery timelines to justify the margin." This cleft politely shifts focus from refusal to underlying need, preserving rapport while holding a firm position. Mastery at C2 thus lies in deploying grammar as strategy, calibrating formality, directness, and interpersonal risk across academic and professional genres with intentional variation rather than rote complexity.`;

const C_READING_BUSINESS = `Business negotiation in cross-border contexts illustrates the interplay of language, culture, and power with unusual clarity. When a procurement team enters a final round of vendor selection, the linguistic surface appears transactional — price, lead time, service level — yet the underlying negotiation is relational and procedural. Effective negotiators sequence their moves: they anchor expectations early, concede in small increments tied to reciprocity, and summarize emerging consensus to prevent revision. Rarely does a skilled negotiator open with a concession; seldom will they reveal their walk-away price before testing the counterpart's flexibility. Cleft sentences become tools for reframing: "What concerns us is not the unit cost per se, but the variance in after-sales support across regions." The structure isolates the real issue and signals that a solution addressing that variable will unlock agreement. Inversion, too, functions as emphasis and cohesion: "Not until the compliance review is complete can we authorize the rollout." Placed after a detailed risk analysis, the inversion converts a procedural constraint into a logical consequence rather than an arbitrary block. For learners at C1-C2, the pedagogical goal is not to memorize such forms but to recognize when indirectness mitigates face-threat and when directness signals confidence. Simulations that mirror authentic pressures — time limits, incomplete information, shifting stakeholders — train this judgment far better than gap-fill drills alone, even as controlled practice builds the automatization needed to deploy these forms under pressure.`;

const C_TEMPLATES: typeof EXERCISE_TEMPLATES = [
  {
    type: "fill_blanks",
    prompt: {
      text: "___ had the report been published when the controversy erupted. (Negative inversion)",
      blanks: [{ id: "b1", hint: "No sooner / Hardly" }],
    },
    solution: { answers: { b1: ["No sooner", "Hardly"] } },
    difficulty: 5,
  },
  {
    type: "ordering",
    prompt: { tokens: ["What", "we", "need", "is", "greater", "transparency", "on", "pricing"] },
    solution: { order: ["What", "we", "need", "is", "greater", "transparency", "on", "pricing"] },
    difficulty: 5,
  },
  {
    type: "transformation",
    prompt: {
      instruction:
        "Rewrite with inversion: The significance of the finding had never been so contested.",
      sentence: "The significance of the finding had never been so contested.",
    },
    solution: {
      accepted: [
        "Never had the significance of the finding been so contested.",
        "Never before had the significance of the finding been so contested.",
      ],
    },
    difficulty: 5,
  },
  {
    type: "flashcard",
    prompt: {
      front: "mitigate (v) — to make less severe",
      back: "mitigar",
      imageUrl: picsum("flashcard-mitigate", 300, 200),
    },
    solution: { back: "mitigar" },
    difficulty: 5,
  },
  {
    type: "matching",
    prompt: {
      pairs: [
        { id: "1", left: "cleft sentence", right: "What matters is X" },
        { id: "2", left: "hedging", right: "It seems plausible that" },
      ],
    },
    solution: {
      pairs: [
        { id: "1", left: "cleft sentence", right: "What matters is X" },
        { id: "2", left: "hedging", right: "It seems plausible that" },
      ],
    },
    difficulty: 5,
  },
  {
    type: "listening_tts",
    prompt: {
      text: "Not until the board approves the proposal can we proceed with the investment.",
      question: "When can we proceed?",
      options: ["After board approval", "Immediately"],
    },
    solution: { answer: "After board approval" },
    difficulty: 5,
  },
  {
    type: "dictation",
    prompt: {
      text: "What the data indicate is a correlation rather than a causal relationship between variables",
      playsAllowed: 2,
    },
    solution: {
      text: "What the data indicate is a correlation rather than a causal relationship between variables",
    },
    difficulty: 5,
  },
  {
    type: "comprehension",
    prompt: {
      passage:
        "It is precisely the replication crisis that has forced journals to tighten reporting standards, requiring preregistration and open data.",
      question: "What forced journals to tighten standards?",
      options: ["Replication crisis", "Funding cuts"],
    },
    solution: { answer: "Replication crisis" },
    difficulty: 5,
  },
  {
    type: "graded_reading",
    prompt: {
      title: "Hedging and Stance in Academic Writing",
      passage: C_READING_ACADEMIC,
      vocab: [
        { word: "hedge", definition: "to soften a claim" },
        {
          word: "cleft",
          definition: "a syntax that foregrounds part of a clause, e.g., What matters is X",
        },
        { word: "inversion", definition: "reversal of normal word order for emphasis" },
      ],
      questions: [
        {
          id: "q1",
          question: "What do hedges signal?",
          options: ["Humility and openness to dialogue", "Certainty"],
          answer: "Humility and openness to dialogue",
        },
        {
          id: "q2",
          question: "What does the cleft emphasize in the example?",
          options: ["Correlation vs causation", "Sample size"],
          answer: "Correlation vs causation",
        },
        {
          id: "q3",
          question: "What rhetorical function does inversion serve here?",
          options: ["Cohesion and emphasis", "Citation"],
          answer: "Cohesion and emphasis",
        },
      ],
    },
    solution: {
      answers: {
        q1: "Humility and openness to dialogue",
        q2: "Correlation vs causation",
        q3: "Cohesion and emphasis",
      },
    },
    difficulty: 5,
  },
  {
    type: "writing_prompt",
    prompt: {
      prompt:
        "Write a 250-300 word academic paragraph arguing that open data should be mandatory for publicly funded research. Use at least one cleft and one inversion for emphasis. Hedging required.",
      minWords: 200,
      maxWords: 350,
    },
    solution: {
      sampleAnswer:
        "What public funding implies is a responsibility to enable scrutiny. Never has reproducibility been more vital...",
    },
    difficulty: 5,
  },
  {
    type: "speaking_record",
    prompt: {
      text: "Not until we address the compliance risks can we finalize the partnership agreement.",
      instruction: "Deliver this stance with firm but diplomatic intonation",
    },
    solution: {
      reference:
        "Not until we address the compliance risks can we finalize the partnership agreement.",
    },
    difficulty: 5,
  },
  {
    type: "shadowing",
    prompt: {
      reference: "What we are proposing is a phased rollout contingent on milestone verification.",
      speed: 1,
      variants: [0.85, 1, 1.15],
    },
    solution: {
      reference: "What we are proposing is a phased rollout contingent on milestone verification.",
    },
    difficulty: 5,
  },
  {
    type: "pronunciation",
    prompt: {
      word: "epistemology",
      phonetic: "/ɪˌpɪstəˈmɒlədʒi/",
      example: "Epistemology shapes how we frame research questions.",
    },
    solution: { word: "epistemology" },
    difficulty: 5,
  },
  // Second reading for variance
  {
    type: "graded_reading",
    prompt: {
      title: "Negotiating Across Cultures",
      passage: C_READING_BUSINESS,
      vocab: [
        { word: "anchor", definition: "to set an initial reference point" },
        { word: "reciprocity", definition: "mutual exchange" },
      ],
      questions: [
        {
          id: "q1",
          question: "Why sequence moves carefully?",
          options: ["To anchor and test flexibility", "To rush agreement"],
          answer: "To anchor and test flexibility",
        },
        {
          id: "q2",
          question: "What does the cleft reframe?",
          options: ["The real issue is support variance, not price", "Price is the only issue"],
          answer: "The real issue is support variance, not price",
        },
      ],
    },
    solution: {
      answers: {
        q1: "To anchor and test flexibility",
        q2: "The real issue is support variance, not price",
      },
    },
    difficulty: 5,
  },
];

const LEVEL_META: Record<
  string,
  { title: string; description: string; orderIndex: number; unitNames: [string, string] }
> = {
  A1: {
    title: "Beginner (A1)",
    description: "CEFR A1 - Beginner",
    orderIndex: 1,
    unitNames: ["Basics", "Daily Life"],
  },
  A2: {
    title: "Elementary (A2)",
    description: "CEFR A2 - Elementary",
    orderIndex: 2,
    unitNames: ["Travel", "Work Basics"],
  },
  B1: {
    title: "Intermediate (B1)",
    description: "CEFR B1 - Intermediate",
    orderIndex: 3,
    unitNames: ["Professional Communication", "Culture & Media"],
  },
  B2: {
    title: "Upper Intermediate (B2)",
    description: "CEFR B2 - Upper Intermediate",
    orderIndex: 4,
    unitNames: ["Academic & Business", "Critical Thinking"],
  },
  C1: {
    title: "Advanced (C1)",
    description: "CEFR C1 - Advanced academic & professional",
    orderIndex: 5,
    unitNames: ["Academic Discourse", "Professional Negotiation"],
  },
  C2: {
    title: "Mastery (C2)",
    description: "CEFR C2 - Mastery & nuance",
    orderIndex: 6,
    unitNames: ["Nuance, Idioms & Register", "Mastery & Research"],
  },
};

async function seedLevel(levelCode: string) {
  const meta = LEVEL_META[levelCode]!;
  const level = await prisma.level.upsert({
    where: { code: levelCode as never },
    update: {},
    create: {
      code: levelCode as never,
      title: meta.title,
      description: meta.description,
      orderIndex: meta.orderIndex,
    },
  });

  const templates = levelCode.startsWith("C")
    ? C_TEMPLATES
    : levelCode.startsWith("B")
      ? B_TEMPLATES
      : EXERCISE_TEMPLATES;
  const perLessonCount = levelCode.startsWith("C") ? 5 : levelCode.startsWith("B") ? 4 : 3;

  for (let ui = 1; ui <= 2; ui++) {
    const unitCover = picsum(`${levelCode}-unit-${ui}`, 800, 400);
    let unit = await prisma.unit.findFirst({ where: { levelId: level.id, orderIndex: ui } });
    if (!unit) {
      try {
        unit = await prisma.unit.create({
          data: {
            levelId: level.id,
            title: `${levelCode} Unit ${ui}: ${meta.unitNames[ui - 1]}`,
            description: `Unit ${ui} for ${levelCode}`,
            orderIndex: ui,
            coverImage: unitCover,
          } as never,
        });
      } catch {
        unit = await prisma.unit.create({
          data: {
            levelId: level.id,
            title: `${levelCode} Unit ${ui}: ${meta.unitNames[ui - 1]}`,
            description: `Unit ${ui} for ${levelCode}`,
            orderIndex: ui,
          },
        });
      }
    } else if (!(unit as unknown as { coverImage: string | null }).coverImage) {
      try {
        unit = await prisma.unit.update({
          where: { id: unit.id },
          data: { coverImage: unitCover } as never,
        });
      } catch {}
    }
    for (let li = 1; li <= 3; li++) {
      const isQuiz = li === 3;
      const kind = lessonKindFor(li, false);
      const coverImage = picsum(`${levelCode}-U${ui}L${li}`, 800, 450);
      const content =
        kind === "teach"
          ? buildLessonContent(levelCode, `${levelCode} Unit ${ui}: ${meta.unitNames[ui - 1]}`, li)
          : null;
      let lesson = await prisma.lesson.findFirst({ where: { unitId: unit.id, orderIndex: li } });
      if (!lesson) {
        try {
          lesson = await prisma.lesson.create({
            data: {
              unitId: unit.id,
              title: `Lesson ${li}${isQuiz ? " — Quiz" : ""}`,
              objectives: `Objectives for ${levelCode} U${ui} L${li}`,
              orderIndex: li,
              estimatedMinutes: levelCode.startsWith("C")
                ? 20
                : levelCode.startsWith("B")
                  ? 15
                  : 10,
              isQuiz,
              isExam: false,
              kind: kind as never,
              coverImage,
              content: content as never,
            } as never,
          });
        } catch {
          lesson = await prisma.lesson.create({
            data: {
              unitId: unit.id,
              title: `Lesson ${li}${isQuiz ? " — Quiz" : ""}`,
              objectives: `Objectives for ${levelCode} U${ui} L${li}`,
              orderIndex: li,
              estimatedMinutes: levelCode.startsWith("C")
                ? 20
                : levelCode.startsWith("B")
                  ? 15
                  : 10,
              isQuiz,
              isExam: false,
            },
          });
        }
      } else {
        // backfill kind/content/coverImage for existing rows (idempotent)
        const needsUpdate =
          !(lesson as unknown as { kind: unknown }).kind ||
          !(lesson as unknown as { coverImage: unknown }).coverImage ||
          (kind === "teach" && !(lesson as unknown as { content: unknown }).content);
        if (needsUpdate) {
          try {
            lesson = await prisma.lesson.update({
              where: { id: lesson.id },
              data: {
                kind: kind as never,
                coverImage,
                ...(content ? { content: content as never } : {}),
              } as never,
            });
          } catch {}
        }
      }
      const startIdx = ((ui - 1) * perLessonCount + (li - 1) * perLessonCount) % templates.length;
      for (let ei = 0; ei < perLessonCount; ei++) {
        const tmpl = templates[(startIdx + ei) % templates.length]!;
        const existing = await prisma.exercise.findFirst({
          where: { lessonId: lesson.id, type: tmpl.type as never },
        });
        if (existing) continue;
        await prisma.exercise.create({
          data: {
            lessonId: lesson.id,
            type: tmpl.type as never,
            difficulty: tmpl.difficulty,
            prompt: tmpl.prompt as never,
            solution: tmpl.solution as never,
            aiGenerated: false,
          },
        });
      }
    }
  }
  // Level exam unit
  let examUnit = await prisma.unit.findFirst({ where: { levelId: level.id, orderIndex: 99 } });
  if (!examUnit) {
    try {
      examUnit = await prisma.unit.create({
        data: {
          levelId: level.id,
          title: `${levelCode} Final Exam`,
          description: `Final exam for ${levelCode}`,
          orderIndex: 99,
          coverImage: picsum(`${levelCode}-exam-unit`, 800, 400),
        } as never,
      });
    } catch {
      examUnit = await prisma.unit.create({
        data: {
          levelId: level.id,
          title: `${levelCode} Final Exam`,
          description: `Final exam for ${levelCode}`,
          orderIndex: 99,
        },
      });
    }
  } else if (!(examUnit as unknown as { coverImage: string | null }).coverImage) {
    try {
      examUnit = await prisma.unit.update({
        where: { id: examUnit.id },
        data: { coverImage: picsum(`${levelCode}-exam-unit`, 800, 400) } as never,
      });
    } catch {}
  }
  let examLesson = await prisma.lesson.findFirst({ where: { unitId: examUnit.id, orderIndex: 1 } });
  if (!examLesson) {
    try {
      examLesson = await prisma.lesson.create({
        data: {
          unitId: examUnit.id,
          title: `${levelCode} Final Exam`,
          objectives: `Comprehensive exam for ${levelCode}`,
          orderIndex: 1,
          estimatedMinutes: 30,
          isQuiz: false,
          isExam: true,
          kind: "exam" as never,
          coverImage: picsum(`${levelCode}-exam-lesson`, 800, 450),
          content: null as never,
        } as never,
      });
    } catch {
      examLesson = await prisma.lesson.create({
        data: {
          unitId: examUnit.id,
          title: `${levelCode} Final Exam`,
          objectives: `Comprehensive exam for ${levelCode}`,
          orderIndex: 1,
          estimatedMinutes: 30,
          isQuiz: false,
          isExam: true,
        },
      });
    }
  } else if (!(examLesson as unknown as { kind: unknown }).kind) {
    try {
      examLesson = await prisma.lesson.update({
        where: { id: examLesson.id },
        data: {
          kind: "exam" as never,
          coverImage: picsum(`${levelCode}-exam-lesson`, 800, 450),
        } as never,
      });
    } catch {}
  }
  if ((await prisma.exercise.count({ where: { lessonId: examLesson.id } })) === 0) {
    for (let i = 0; i < 5; i++) {
      const tmpl = templates[i % templates.length]!;
      await prisma.exercise.create({
        data: {
          lessonId: examLesson.id,
          type: tmpl.type as never,
          difficulty: levelCode.startsWith("C") ? 5 : levelCode.startsWith("B") ? 4 : 3,
          prompt: tmpl.prompt as never,
          solution: tmpl.solution as never,
        },
      });
    }
  }
}

async function main() {
  console.log("Seeding A1..C2...");

  for (const code of ["A1", "A2", "B1", "B2", "C1", "C2"] as const) await seedLevel(code);

  // Badges B-level + C-level informal certificates
  const badges = [
    {
      code: "first_lesson",
      title: "First Step",
      description: "Complete your first lesson",
      icon: "🎯",
      rule: { type: "lessons_completed", gte: 1 },
      isPremium: false,
    },
    {
      code: "streak_3",
      title: "3-Day Streak",
      description: "3 days in a row",
      icon: "🔥",
      rule: { type: "streak", gte: 3 },
      isPremium: false,
    },
    {
      code: "streak_7",
      title: "Week Warrior",
      description: "7-day streak",
      icon: "🏆",
      rule: { type: "streak", gte: 7 },
      isPremium: false,
    },
    {
      code: "a1_complete",
      title: "A1 Complete",
      description: "Pass A1 exam",
      icon: "🎓",
      rule: { type: "level_pass", equals: "A1" },
      isPremium: false,
    },
    {
      code: "a2_complete",
      title: "A2 Complete",
      description: "Pass A2 exam",
      icon: "🎓",
      rule: { type: "level_pass", equals: "A2" },
      isPremium: false,
    },
    {
      code: "b1_complete",
      title: "B1 Complete",
      description: "Pass B1 exam",
      icon: "🎓",
      rule: { type: "level_pass", equals: "B1" },
      isPremium: false,
    },
    {
      code: "b2_complete",
      title: "B2 Complete",
      description: "Pass B2 exam",
      icon: "🎓",
      rule: { type: "level_pass", equals: "B2" },
      isPremium: false,
    },
    {
      code: "c1_complete",
      title: "C1 Advanced",
      description: "Pass C1 exam — Advanced academic & professional",
      icon: "🎓",
      rule: { type: "level_pass", equals: "C1" },
      isPremium: false,
    },
    {
      code: "c2_master",
      title: "C2 Mastery",
      description: "Pass C2 exam — Mastery, awarded as informal certificate",
      icon: "🏅",
      rule: { type: "level_pass", equals: "C2" },
      isPremium: false,
    },
    {
      code: "c2_distinction",
      title: "C2 Distinction (Premium)",
      description: "Premium distinction badge — future paywall placeholder",
      icon: "💎",
      rule: { type: "level_pass", equals: "C2" },
      isPremium: true,
    },
    {
      code: "xp_100",
      title: "100 XP",
      description: "Earn 100 XP",
      icon: "⭐",
      rule: { type: "xp", gte: 100 },
      isPremium: false,
    },
    {
      code: "xp_500",
      title: "500 XP",
      description: "Earn 500 XP",
      icon: "🌟",
      rule: { type: "xp", gte: 500 },
      isPremium: false,
    },
    {
      code: "ten_lessons",
      title: "Dedicated",
      description: "Complete 10 lessons",
      icon: "📚",
      rule: { type: "lessons_completed", gte: 10 },
      isPremium: false,
    },
    {
      code: "quiz_master",
      title: "Quiz Master",
      description: "Pass 5 quizzes",
      icon: "🧠",
      rule: { type: "lessons_completed", gte: 5 },
      isPremium: false,
    },
    {
      code: "explorer",
      title: "Explorer",
      description: "Try all exercise types",
      icon: "🗺️",
      rule: { type: "lessons_completed", gte: 3 },
      isPremium: false,
    },
  ];
  for (const b of badges)
    await prisma.badge.upsert({
      where: { code: b.code },
      update: { title: b.title, description: b.description, icon: b.icon, isPremium: b.isPremium },
      create: b as never,
    });

  const shopItems = [
    {
      title: "Streak Freeze",
      description: "Protect your streak for one day",
      priceXp: 100,
      cosmeticType: "freeze",
      assetUrl: "/lesson-images/shop/streak-freeze.png",
      rarity: "common",
      isPremium: false,
    },
    {
      title: "Avatar Hat",
      description: "Cool hat for your avatar",
      priceXp: 150,
      cosmeticType: "avatar",
      assetUrl: "/lesson-images/shop/avatar-hat.png",
      rarity: "common",
      isPremium: false,
    },
    {
      title: "Golden Badge Frame",
      description: "Shiny frame",
      priceXp: 200,
      cosmeticType: "frame",
      assetUrl: "/lesson-images/shop/avatar-frame-gold.png",
      rarity: "rare",
      isPremium: false,
    },
    {
      title: "Theme: Ocean",
      description: "Ocean theme",
      priceXp: 250,
      cosmeticType: "theme",
      assetUrl: "/lesson-images/shop/theme-ocean.png",
      rarity: "rare",
      isPremium: false,
    },
    {
      title: "XP Boost (1 day)",
      description: "Double XP for 24h",
      priceXp: 300,
      cosmeticType: "boost",
      assetUrl: "/lesson-images/shop/xp-boost.png",
      rarity: "epic",
      isPremium: false,
    },
    {
      title: "Avatar Pet",
      description: "Cute companion",
      priceXp: 400,
      cosmeticType: "pet",
      assetUrl: "/lesson-images/shop/avatar-pet.png",
      rarity: "epic",
      isPremium: false,
    },
    {
      title: "Legendary Title",
      description: "Show off",
      priceXp: 500,
      cosmeticType: "title",
      assetUrl: "/lesson-images/shop/legendary-title.png",
      rarity: "legendary",
      isPremium: false,
    },
    {
      title: "Confetti Effect",
      description: "Celebration effect",
      priceXp: 350,
      cosmeticType: "effect",
      assetUrl: "/lesson-images/shop/confetti-effect.png",
      rarity: "rare",
      isPremium: false,
    },
    {
      title: "Premium Badge Frame — Diamond",
      description: "Premium cosmetic — paywall placeholder",
      priceXp: 800,
      cosmeticType: "frame",
      assetUrl: "/lesson-images/shop/avatar-frame-diamond.png",
      rarity: "legendary",
      isPremium: true,
    },
  ];
  for (const item of shopItems) {
    const exists = await prisma.shopItem.findFirst({ where: { title: item.title } });
    if (!exists) await prisma.shopItem.create({ data: item as never });
    else if (!(exists as unknown as { assetUrl: string | null }).assetUrl) {
      await prisma.shopItem.update({
        where: { id: (exists as unknown as { id: string }).id },
        data: { assetUrl: item.assetUrl } as never,
      });
    }
  }

  // Challenges seed (all 5 types, future-friendly windows, idempotent by title)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const challengesSeed = [
    {
      title: "Daily Sprint — Complete 5 exercises",
      type: "daily" as const,
      description: "Complete 5 exercises today",
      rule: { metric: "exercises", count: 5 },
      startAt: new Date(now.setHours(0, 0, 0, 0)),
      endAt: tomorrow,
      rewardXp: 30,
    },
    {
      title: "Weekly Marathon — 25 exercises",
      type: "weekly" as const,
      description: "Complete 25 exercises this week",
      rule: { metric: "exercises", count: 25 },
      startAt: new Date(),
      endAt: weekEnd,
      rewardXp: 120,
    },
    {
      title: "Timed Blitz — 10 in 30 min",
      type: "timed" as const,
      description: "Complete 10 exercises in one timed session",
      rule: { metric: "exercises", count: 10 },
      startAt: new Date(),
      endAt: weekEnd,
      rewardXp: 50,
    },
    {
      title: "Streak Keeper — 3 days",
      type: "streak" as const,
      description: "Maintain a 3-day streak",
      rule: { metric: "streak", count: 3 },
      startAt: new Date(),
      endAt: weekEnd,
      rewardXp: 80,
    },
    {
      title: "Leaderboard Sprint — Top 10 XP",
      type: "competitive" as const,
      description: "Earn 200 XP this week and rank top 10",
      rule: { metric: "xp", count: 200 },
      startAt: new Date(),
      endAt: weekEnd,
      rewardXp: 150,
    },
  ];
  for (const c of challengesSeed) {
    const exists = await prisma.challenge.findFirst({ where: { title: c.title } });
    if (!exists)
      await prisma.challenge.create({ data: { id: crypto.randomUUID(), ...c } as never });
  }

  let pt = await prisma.placementTest.findFirst({ where: { title: "Placement Test" } });
  if (!pt)
    pt = await prisma.placementTest.create({ data: { title: "Placement Test", isActive: true } });
  if ((await prisma.placementQuestion.count({ where: { testId: pt.id } })) === 0) {
    for (let i = 0; i < 6; i++) {
      await prisma.placementQuestion.create({
        data: {
          testId: pt.id,
          levelHint: (["A1", "A2", "B1", "B2", "A1", "B2"] as const)[i]! as never,
          prompt: { question: `Placement question ${i + 1}` },
          solution: { answer: "A" },
          weight: 1,
        },
      });
    }
  }

  console.log("Seed complete A1..C2 plus challenges");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
