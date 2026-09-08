import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Minimal viable seed: 2 levels (A1,A2) × 2 units per level × 3 lessons per unit × 2-3 exercises per lesson covering all 13 types

const EXERCISE_TEMPLATES: { type: string; prompt: unknown; solution: unknown; difficulty: number }[] = [
  { type: "fill_blanks", prompt: { text: "She ___ (go) yesterday.", blanks: [{ id: "b1", hint: "past of go" }] }, solution: { answers: { b1: ["went"] } }, difficulty: 1 },
  { type: "ordering", prompt: { tokens: ["she", "went", "yesterday", "to", "school"] }, solution: { order: ["she", "went", "yesterday", "to", "school"] }, difficulty: 1 },
  { type: "transformation", prompt: { instruction: "Make negative", sentence: "She is happy." }, solution: { accepted: ["She is not happy.", "She isn't happy."] }, difficulty: 2 },
  { type: "flashcard", prompt: { front: "apple", back: "manzana", imageUrl: "https://via.placeholder.com/150?text=apple" }, solution: { back: "manzana" }, difficulty: 1 },
  { type: "matching", prompt: { pairs: [{ id: "1", left: "cat", right: "gato" }, { id: "2", left: "dog", right: "perro" }] }, solution: { pairs: [{ id: "1", left: "cat", right: "gato" }, { id: "2", left: "dog", right: "perro" }] }, difficulty: 1 },
  { type: "listening_tts", prompt: { text: "Hello, how are you today?", question: "What did you hear?", options: ["Hello, how are you today?", "Goodbye"] }, solution: { answer: "Hello, how are you today?" }, difficulty: 1 },
  { type: "dictation", prompt: { text: "I like learning English", playsAllowed: 2 }, solution: { text: "I like learning English" }, difficulty: 2 },
  { type: "comprehension", prompt: { passage: "Lena lives in London. She works at a cafe.", question: "Where does Lena live?", options: ["London", "Paris", "Berlin"] }, solution: { answer: "London" }, difficulty: 1 },
  { type: "graded_reading", prompt: { title: "A Day at the Park", passage: "Tom goes to the park every Sunday. He likes to read under a tree. The park is quiet and green.", vocab: [{ word: "quiet", definition: "silent" }], questions: [{ id: "q1", question: "Where does Tom go?", options: ["Park", "School"], answer: "Park" }, { id: "q2", question: "When?", options: ["Sunday", "Monday"], answer: "Sunday" }] }, solution: { answers: { q1: "Park", q2: "Sunday" } }, difficulty: 2 },
  { type: "writing_prompt", prompt: { prompt: "Describe your weekend (30-50 words)", minWords: 10, maxWords: 100 }, solution: { sampleAnswer: "I had a great weekend. I visited my family and went to the park." }, difficulty: 2 },
  { type: "speaking_record", prompt: { text: "Hello, my name is Anna.", instruction: "Introduce yourself" }, solution: { reference: "Hello, my name is Anna." }, difficulty: 1 },
  { type: "shadowing", prompt: { reference: "Could you elaborate?", speed: 1 }, solution: { reference: "Could you elaborate?" }, difficulty: 2 },
  { type: "pronunciation", prompt: { word: "pronunciation", phonetic: "/prəˌnʌnsiˈeɪʃən/", example: "Good pronunciation is important." }, solution: { word: "pronunciation" }, difficulty: 2 },
];

async function main() {
  console.log("Seeding A1-A2...");

  for (const levelCode of ["A1", "A2"] as const) {
    const level = await prisma.level.upsert({
      where: { code: levelCode },
      update: {},
      create: { code: levelCode, title: levelCode === "A1" ? "Beginner (A1)" : "Elementary (A2)", description: `CEFR ${levelCode} - ${levelCode === "A1" ? "Beginner" : "Elementary"}`, orderIndex: levelCode === "A1" ? 1 : 2 },
    });

    for (let ui = 1; ui <= 2; ui++) {
      const unitId = `${levelCode}-unit-${ui}`;
      // use deterministic uuid-like string for idempotency via findFirst + create
      let unit = await prisma.unit.findFirst({ where: { levelId: level.id, orderIndex: ui } });
      if (!unit) {
        unit = await prisma.unit.create({ data: { levelId: level.id, title: `${levelCode} Unit ${ui}: ${["Basics", "Daily Life"][ui - 1]}`, description: `Unit ${ui} for ${levelCode}`, orderIndex: ui } });
      }

      for (let li = 1; li <= 3; li++) {
        const isQuiz = li === 3; // last lesson per unit is quiz
        let lesson = await prisma.lesson.findFirst({ where: { unitId: unit.id, orderIndex: li } });
        if (!lesson) {
          lesson = await prisma.lesson.create({
            data: { unitId: unit.id, title: `Lesson ${li}${isQuiz ? " — Quiz" : ""}`, objectives: `Objectives for ${levelCode} U${ui} L${li}`, orderIndex: li, estimatedMinutes: 10, isQuiz, isExam: false },
          });
        }

        // create 3 exercises per lesson rotating through types
        const startIdx = ((ui - 1) * 3 + (li - 1) * 3) % EXERCISE_TEMPLATES.length;
        for (let ei = 0; ei < 3; ei++) {
          const tmpl = EXERCISE_TEMPLATES[(startIdx + ei) % EXERCISE_TEMPLATES.length]!;
          const existing = await prisma.exercise.findFirst({ where: { lessonId: lesson.id, type: tmpl.type as never } });
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

    // Level exam
    let examUnit = await prisma.unit.findFirst({ where: { levelId: level.id, orderIndex: 99 } });
    if (!examUnit) {
      examUnit = await prisma.unit.create({ data: { levelId: level.id, title: `${levelCode} Final Exam`, description: `Final exam for ${levelCode}`, orderIndex: 99 } });
    }
    let examLesson = await prisma.lesson.findFirst({ where: { unitId: examUnit.id, orderIndex: 1 } });
    if (!examLesson) {
      examLesson = await prisma.lesson.create({ data: { unitId: examUnit.id, title: `${levelCode} Final Exam`, objectives: `Comprehensive exam for ${levelCode}`, orderIndex: 1, estimatedMinutes: 30, isQuiz: false, isExam: true } });
    }
    if ((await prisma.exercise.count({ where: { lessonId: examLesson.id } })) === 0) {
      for (let i = 0; i < 5; i++) {
        const tmpl = EXERCISE_TEMPLATES[i % EXERCISE_TEMPLATES.length]!;
        await prisma.exercise.create({ data: { lessonId: examLesson.id, type: tmpl.type as never, difficulty: 3, prompt: tmpl.prompt as never, solution: tmpl.solution as never } });
      }
    }
  }

  // Badges
  const badges = [
    { code: "first_lesson", title: "First Step", description: "Complete your first lesson", icon: "🎯", rule: { type: "lessons_completed", gte: 1 } },
    { code: "streak_3", title: "3-Day Streak", description: "3 days in a row", icon: "🔥", rule: { type: "streak", gte: 3 } },
    { code: "streak_7", title: "Week Warrior", description: "7-day streak", icon: "🏆", rule: { type: "streak", gte: 7 } },
    { code: "a1_complete", title: "A1 Complete", description: "Pass A1 exam", icon: "🎓", rule: { type: "level_pass", equals: "A1" } },
    { code: "a2_complete", title: "A2 Complete", description: "Pass A2 exam", icon: "🎓", rule: { type: "level_pass", equals: "A2" } },
    { code: "xp_100", title: "100 XP", description: "Earn 100 XP", icon: "⭐", rule: { type: "xp", gte: 100 } },
    { code: "xp_500", title: "500 XP", description: "Earn 500 XP", icon: "🌟", rule: { type: "xp", gte: 500 } },
    { code: "ten_lessons", title: "Dedicated", description: "Complete 10 lessons", icon: "📚", rule: { type: "lessons_completed", gte: 10 } },
    { code: "quiz_master", title: "Quiz Master", description: "Pass 5 quizzes", icon: "🧠", rule: { type: "lessons_completed", gte: 5 } },
    { code: "explorer", title: "Explorer", description: "Try all exercise types", icon: "🗺️", rule: { type: "lessons_completed", gte: 3 } },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({ where: { code: b.code }, update: {}, create: b as never });
  }

  // Shop items
  const shopItems = [
    { title: "Streak Freeze", description: "Protect your streak for one day", priceXp: 100, cosmeticType: "freeze", assetUrl: null, rarity: "common" },
    { title: "Avatar Hat", description: "Cool hat for your avatar", priceXp: 150, cosmeticType: "avatar", assetUrl: null, rarity: "common" },
    { title: "Golden Badge Frame", description: "Shiny frame", priceXp: 200, cosmeticType: "frame", assetUrl: null, rarity: "rare" },
    { title: "Theme: Ocean", description: "Ocean theme", priceXp: 250, cosmeticType: "theme", assetUrl: null, rarity: "rare" },
    { title: "XP Boost (1 day)", description: "Double XP for 24h", priceXp: 300, cosmeticType: "boost", assetUrl: null, rarity: "epic" },
    { title: "Avatar Pet", description: "Cute companion", priceXp: 400, cosmeticType: "pet", assetUrl: null, rarity: "epic" },
    { title: "Legendary Title", description: "Show off", priceXp: 500, cosmeticType: "title", assetUrl: null, rarity: "legendary" },
    { title: "Confetti Effect", description: "Celebration effect", priceXp: 350, cosmeticType: "effect", assetUrl: null, rarity: "rare" },
  ];
  for (const item of shopItems) {
    const exists = await prisma.shopItem.findFirst({ where: { title: item.title } });
    if (!exists) await prisma.shopItem.create({ data: item as never });
  }

  // Placement test
  let pt = await prisma.placementTest.findFirst({ where: { title: "Placement Test" } });
  if (!pt) pt = await prisma.placementTest.create({ data: { title: "Placement Test", isActive: true } });
  if ((await prisma.placementQuestion.count({ where: { testId: pt.id } })) === 0) {
    for (let i = 0; i < 6; i++) {
      await prisma.placementQuestion.create({ data: { testId: pt.id, levelHint: (["A1", "A2", "A1", "A2", "A1", "A2"] as const)[i]! as never, prompt: { question: `Placement question ${i + 1}` }, solution: { answer: "A" }, weight: 1 } });
    }
  }

  console.log("Seed complete");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
