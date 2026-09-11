import { PrismaClient } from "@prisma/client";
import { getCurriculumMode } from "../lib/curriculum/config.js";
import { generateLessons } from "../lib/curriculum/lessonGenerator.js";
import { generateQuizzes } from "../lib/curriculum/quizGenerator.js";
import { canonicalForLesson } from "../lib/curriculum/imageNaming.js";

const prisma = new PrismaClient();

// --- PRD strict helpers: arg parsing, id parsing, seed ---
function parseArgsSeed(): { mode: string | undefined; seed: number | undefined } {
  const a = process.argv.slice(2);
  const mi = a.indexOf("--mode");
  const si = a.indexOf("--seed");
  const mode = mi !== -1 ? a[mi + 1] : undefined;
  const seedRaw = si !== -1 ? a[si + 1] : undefined;
  const seed = seedRaw !== undefined ? Number(seedRaw) : undefined;
  return { mode, seed };
}
function parsePrdId(id: string): { level: string; mod: number; les: number } {
  const m = /^([a-c][12])_m([1-4])_l([1-3])$/.exec(id);
  if (!m) throw new Error(`INVALID_LESSON_ID ${id}`);
  return { level: m[1]!.toUpperCase(), mod: Number(m[2]), les: Number(m[3]) };
}

// --- Helpers for Lesson model (kind/content/coverImage)
function picsum(seed: string, w = 600, h = 340): string {
  const safe = seed.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `https://picsum.photos/seed/${safe}/${w}/${h}`;
}

function coverForLevel(levelCode: string): string {
  const c = levelCode.toLowerCase();
  if (["a1", "a2", "b1", "b2", "c1", "c2"].includes(c)) return `/lesson-images/level-${c}.png`;
  return "/lesson-images/teaching-placeholder.png";
}

function lessonImagePath(levelCode: string, unitIndex: number, lessonIndex: number): string {
  const c = levelCode.toLowerCase();
  return `/lesson-images/lessons/${c}-u${unitIndex}-l${lessonIndex}.png`;
}

function flashcardLocalPath(word: string): string {
  const safe = word.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `/lesson-images/exercises/flashcard-${safe}.png`;
}

// Local flashcard images we will generate via Pollinations (free tier) — prioritize local, fallback to picsum
const FLASHCARD_LOCAL_WORDS = new Set([
  "apple",
  "sustainable",
  "mitigate",
  "hello",
  "family",
  "negotiation",
]);

// Keep alt/caption thematic per level (used as fallback when unit-specific not available)
const LEVEL_IMAGE_ALT: Record<string, { en: string; es: string }> = {
  A1: {
    en: "Two students greeting at reception — A1 greetings and introductions",
    es: "Dos estudiantes saludándose en recepción — saludos y presentaciones A1",
  },
  A2: {
    en: "Local market scene — A2 daily life and travel vocabulary",
    es: "Escena de mercado local — vocabulario de vida diaria y viajes A2",
  },
  B1: {
    en: "Business meeting in office — B1 professional communication",
    es: "Reunión de trabajo en oficina — comunicación profesional B1",
  },
  B2: {
    en: "University campus discussion — B2 academic and business English",
    es: "Debate en campus universitario — inglés académico y de negocios B2",
  },
  C1: {
    en: "Academic conference presentation — C1 advanced discourse",
    es: "Presentación en congreso académico — discurso avanzado C1",
  },
  C2: {
    en: "Executive boardroom negotiation — C2 mastery and nuance",
    es: "Negociación en sala de juntas — dominio y matices C2",
  },
};
const LEVEL_IMAGE_CAPTION: Record<string, { en: string; es: string }> = {
  A1: {
    en: "Greetings and introductions — A1 everyday English",
    es: "Saludos y presentaciones — inglés cotidiano A1",
  },
  A2: {
    en: "Daily life and travel — A2 confidence for routines and trips",
    es: "Vida diaria y viajes — A2 confianza para rutinas y viajes",
  },
  B1: {
    en: "Professional meetings and emails — B1 workplace English",
    es: "Reuniones y correos profesionales — inglés laboral B1",
  },
  B2: {
    en: "Academic discussion and argument — B2 critical thinking",
    es: "Debate académico y argumentación — B2 pensamiento crítico",
  },
  C1: {
    en: "Advanced academic discourse — C1 stance and cohesion",
    es: "Discurso académico avanzado — postura y cohesión C1",
  },
  C2: {
    en: "Mastery: negotiation and register — C2 nuance and idioms",
    es: "Dominio: negociación y registro — matices y modismos C2",
  },
};

function lessonKindForUnit(li: number, totalLessons: number): "teach" | "quiz" | "exam" {
  if (li === totalLessons) return "quiz";
  return "teach";
}

// ---------------------------------------------------------------------------
// LEVEL_META — 6 units per level (task req 5-6) => ~30 lessons + exam = ~31/level => 186 total
// ---------------------------------------------------------------------------
const LEVEL_META: Record<
  string,
  { title: string; description: string; orderIndex: number; unitNames: string[] }
> = {
  A1: {
    title: "Beginner (A1)",
    description: "CEFR A1 - Beginner",
    orderIndex: 1,
    unitNames: ["Basics", "Greetings", "Family", "Food & Drink", "Home", "Daily Routine"],
  },
  A2: {
    title: "Elementary (A2)",
    description: "CEFR A2 - Elementary",
    orderIndex: 2,
    unitNames: [
      "Travel",
      "Shopping",
      "Work Basics",
      "Health & Fitness",
      "Weather & Seasons",
      "Hobbies",
    ],
  },
  B1: {
    title: "Intermediate (B1)",
    description: "CEFR B1 - Intermediate",
    orderIndex: 3,
    unitNames: [
      "Professional Communication",
      "Culture & Media",
      "Education & Learning",
      "Environment",
      "Technology",
      "Social Issues",
    ],
  },
  B2: {
    title: "Upper Intermediate (B2)",
    description: "CEFR B2 - Upper Intermediate",
    orderIndex: 4,
    unitNames: [
      "Academic & Business",
      "Critical Thinking",
      "Science & Innovation",
      "Arts & Culture",
      "Global Challenges",
      "Leadership",
    ],
  },
  C1: {
    title: "Advanced (C1)",
    description: "CEFR C1 - Advanced academic & professional",
    orderIndex: 5,
    unitNames: [
      "Academic Discourse",
      "Professional Negotiation",
      "Research Methods",
      "Ethics & Philosophy",
      "Media & Persuasion",
      "Innovation & Strategy",
    ],
  },
  C2: {
    title: "Mastery (C2)",
    description: "CEFR C2 - Mastery & nuance",
    orderIndex: 6,
    unitNames: [
      "Nuance, Idioms & Register",
      "Mastery & Research",
      "Advanced Stylistics",
      "Cross-cultural Diplomacy",
      "Academic Publishing",
      "Executive Leadership",
    ],
  },
};

const LEVEL_META_ES: Record<string, string[]> = {
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

// ---------------------------------------------------------------------------
// VOCABULARY DB — word -> definitions + examples (bilingual)
// Covers all units thematically. If word missing, fallback will generate.
// ---------------------------------------------------------------------------
type VocabDetail = { defEn: string; defEs: string; example: string; exampleEs: string };
const WORD_DETAILS: Record<string, VocabDetail> = {
  hello: {
    defEn: "used to greet someone",
    defEs: "usado para saludar a alguien",
    example: "Hello, nice to meet you.",
    exampleEs: "Hola, encantado de conocerte.",
  },
  goodbye: {
    defEn: "used when leaving",
    defEs: "usado al despedirse",
    example: "Goodbye, see you tomorrow!",
    exampleEs: "¡Adiós, nos vemos mañana!",
  },
  please: {
    defEn: "polite request word",
    defEs: "palabra para pedir con cortesía",
    example: "Please help me with this.",
    exampleEs: "Por favor, ayúdame con esto.",
  },
  "thank you": {
    defEn: "express gratitude",
    defEs: "expresar gratitud",
    example: "Thank you for your help.",
    exampleEs: "Gracias por tu ayuda.",
  },
  welcome: {
    defEn: "greeting on arrival",
    defEs: "saludo al llegar",
    example: "Welcome to our school!",
    exampleEs: "¡Bienvenido a nuestra escuela!",
  },
  introduce: {
    defEn: "to present someone",
    defEs: "presentar a alguien",
    example: "Let me introduce my colleague.",
    exampleEs: "Déjame presentar a mi colega.",
  },
  excuse: {
    defEn: "to ask forgiveness / get attention",
    defEs: "pedir perdón / llamar la atención",
    example: "Excuse me, where is the station?",
    exampleEs: "Perdona, ¿dónde está la estación?",
  },
  family: {
    defEn: "group of related people",
    defEs: "grupo de personas emparentadas",
    example: "My family lives in Madrid.",
    exampleEs: "Mi familia vive en Madrid.",
  },
  mother: {
    defEn: "female parent",
    defEs: "madre",
    example: "My mother is a teacher.",
    exampleEs: "Mi madre es profesora.",
  },
  father: {
    defEn: "male parent",
    defEs: "padre",
    example: "My father works in an office.",
    exampleEs: "Mi padre trabaja en una oficina.",
  },
  sister: {
    defEn: "female sibling",
    defEs: "hermana",
    example: "My sister studies English.",
    exampleEs: "Mi hermana estudia inglés.",
  },
  brother: {
    defEn: "male sibling",
    defEs: "hermano",
    example: "My brother plays football.",
    exampleEs: "Mi hermano juega al fútbol.",
  },
  child: {
    defEn: "young person",
    defEs: "niño / hijo",
    example: "The child is sleeping.",
    exampleEs: "El niño está durmiendo.",
  },
  apple: {
    defEn: "a round red or green fruit",
    defEs: "fruta redonda roja o verde",
    example: "She eats an apple every day.",
    exampleEs: "Ella come una manzana cada día.",
  },
  water: {
    defEn: "clear liquid we drink",
    defEs: "líquido claro que bebemos",
    example: "Please bring me some water.",
    exampleEs: "Por favor, tráeme agua.",
  },
  bread: {
    defEn: "food made from flour",
    defEs: "alimento hecho con harina",
    example: "Fresh bread smells wonderful.",
    exampleEs: "El pan fresco huele de maravilla.",
  },
  coffee: {
    defEn: "hot drink from beans",
    defEs: "bebida caliente de granos",
    example: "I drink coffee in the morning.",
    exampleEs: "Bebo café por la mañana.",
  },
  restaurant: {
    defEn: "place to eat meals",
    defEs: "lugar para comer",
    example: "We booked a table at the restaurant.",
    exampleEs: "Reservamos mesa en el restaurante.",
  },
  menu: {
    defEn: "list of dishes",
    defEs: "lista de platos",
    example: "Can I see the menu, please?",
    exampleEs: "¿Puedo ver el menú, por favor?",
  },
  house: {
    defEn: "building for living",
    defEs: "edificio para vivir",
    example: "They bought a small house.",
    exampleEs: "Compraron una casa pequeña.",
  },
  kitchen: {
    defEn: "room for cooking",
    defEs: "habitación para cocinar",
    example: "The kitchen is very bright.",
    exampleEs: "La cocina es muy luminosa.",
  },
  bedroom: {
    defEn: "room for sleeping",
    defEs: "habitación para dormir",
    example: "My bedroom has a large window.",
    exampleEs: "Mi dormitorio tiene una ventana grande.",
  },
  bathroom: {
    defEn: "room with toilet and shower",
    defEs: "habitación con baño y ducha",
    example: "The bathroom is next to the bedroom.",
    exampleEs: "El baño está al lado del dormitorio.",
  },
  door: {
    defEn: "entrance to a room",
    defEs: "entrada a una habitación",
    example: "Please close the door.",
    exampleEs: "Por favor, cierra la puerta.",
  },
  window: {
    defEn: "opening in a wall with glass",
    defEs: "abertura en la pared con cristal",
    example: "Open the window, it's hot.",
    exampleEs: "Abre la ventana, hace calor.",
  },
  morning: {
    defEn: "early part of the day",
    defEs: "primera parte del día",
    example: "I jog every morning.",
    exampleEs: "Corro cada mañana.",
  },
  evening: {
    defEn: "late part of the day",
    defEs: "última parte del día",
    example: "We watch TV in the evening.",
    exampleEs: "Vemos la tele por la noche.",
  },
  day: {
    defEn: "24 hours",
    defEs: "24 horas",
    example: "Have a nice day!",
    exampleEs: "¡Que tengas un buen día!",
  },
  time: {
    defEn: "measured in hours and minutes",
    defEs: "medido en horas y minutos",
    example: "What time is it?",
    exampleEs: "¿Qué hora es?",
  },
  work: {
    defEn: "job or activity with effort",
    defEs: "trabajo o actividad con esfuerzo",
    example: "She works at a bank.",
    exampleEs: "Ella trabaja en un banco.",
  },
  school: {
    defEn: "place for learning",
    defEs: "lugar para aprender",
    example: "The children go to school at 8.",
    exampleEs: "Los niños van al colegio a las 8.",
  },
  airport: {
    defEn: "place for planes",
    defEs: "lugar para aviones",
    example: "We arrived early at the airport.",
    exampleEs: "Llegamos pronto al aeropuerto.",
  },
  hotel: {
    defEn: "building for travellers to stay",
    defEs: "edificio para que viajen huéspedes",
    example: "I booked a hotel near the center.",
    exampleEs: "Reservé un hotel cerca del centro.",
  },
  ticket: {
    defEn: "paper for entry or travel",
    defEs: "billete para entrar o viajar",
    example: "I lost my train ticket.",
    exampleEs: "Perdí mi billete de tren.",
  },
  passport: {
    defEn: "document for international travel",
    defEs: "documento para viajar internacionalmente",
    example: "Don't forget your passport.",
    exampleEs: "No olvides tu pasaporte.",
  },
  luggage: {
    defEn: "bags for travel",
    defEs: "maletas para viajar",
    example: "My luggage is heavy.",
    exampleEs: "Mi equipaje pesa mucho.",
  },
  market: {
    defEn: "place to buy and sell",
    defEs: "lugar para comprar y vender",
    example: "We went to the local market.",
    exampleEs: "Fuimos al mercado local.",
  },
  price: {
    defEn: "amount of money needed",
    defEs: "cantidad de dinero necesaria",
    example: "The price is very reasonable.",
    exampleEs: "El precio es muy razonable.",
  },
  clothes: {
    defEn: "items you wear",
    defEs: "prendas que vistes",
    example: "She bought new clothes.",
    exampleEs: "Compró ropa nueva.",
  },
  office: {
    defEn: "place for professional work",
    defEs: "lugar para trabajo profesional",
    example: "The office opens at nine.",
    exampleEs: "La oficina abre a las nueve.",
  },
  meeting: {
    defEn: "gathering to discuss",
    defEs: "reunión para discutir",
    example: "We have a meeting at ten.",
    exampleEs: "Tenemos una reunión a las diez.",
  },
  email: {
    defEn: "message sent electronically",
    defEs: "mensaje enviado electrónicamente",
    example: "I sent you an email yesterday.",
    exampleEs: "Te envié un correo ayer.",
  },
  doctor: {
    defEn: "medical professional",
    defEs: "profesional médico",
    example: "The doctor gave me advice.",
    exampleEs: "El médico me dio un consejo.",
  },
  health: {
    defEn: "state of body and mind",
    defEs: "estado del cuerpo y la mente",
    example: "Health is more important than wealth.",
    exampleEs: "La salud es más importante que la riqueza.",
  },
  fitness: {
    defEn: "being physically fit",
    defEs: "estar en forma física",
    example: "She goes to the gym for fitness.",
    exampleEs: "Va al gimnasio para mantenerse en forma.",
  },
  sun: {
    defEn: "star that gives light",
    defEs: "estrella que da luz",
    example: "The sun is shining.",
    exampleEs: "El sol brilla.",
  },
  rain: {
    defEn: "water falling from clouds",
    defEs: "agua que cae de las nubes",
    example: "Take an umbrella, it may rain.",
    exampleEs: "Lleva paraguas, puede llover.",
  },
  music: {
    defEn: "sounds arranged in a pleasing way",
    defEs: "sonidos organizados de forma agradable",
    example: "I love listening to music.",
    exampleEs: "Me encanta escuchar música.",
  },
  film: {
    defEn: "movie",
    defEs: "película",
    example: "We watched a great film.",
    exampleEs: "Vimos una gran película.",
  },
  culture: {
    defEn: "shared customs and arts",
    defEs: "costumbres y artes compartidas",
    example: "The city has a rich culture.",
    exampleEs: "La ciudad tiene una cultura rica.",
  },
  environment: {
    defEn: "natural world around us",
    defEs: "mundo natural que nos rodea",
    example: "We must protect the environment.",
    exampleEs: "Debemos proteger el medio ambiente.",
  },
  sustainable: {
    defEn: "able to continue without harm",
    defEs: "capaz de continuar sin daño",
    example: "We need sustainable energy solutions.",
    exampleEs: "Necesitamos soluciones energéticas sostenibles.",
  },
  recycle: {
    defEn: "reuse materials",
    defEs: "reutilizar materiales",
    example: "Please recycle plastic bottles.",
    exampleEs: "Por favor, recicla las botellas de plástico.",
  },
  technology: {
    defEn: "application of science for practical use",
    defEs: "aplicación de la ciencia para uso práctico",
    example: "New technology changes our lives.",
    exampleEs: "La nueva tecnología cambia nuestras vidas.",
  },
  internet: {
    defEn: "global computer network",
    defEs: "red global de ordenadores",
    example: "I found it on the internet.",
    exampleEs: "Lo encontré en internet.",
  },
  budget: {
    defEn: "plan for money",
    defEs: "plan para el dinero",
    example: "We need to cut the budget.",
    exampleEs: "Necesitamos recortar el presupuesto.",
  },
  deadline: {
    defEn: "latest time to finish",
    defEs: "fecha límite para terminar",
    example: "The deadline is Friday.",
    exampleEs: "La fecha límite es el viernes.",
  },
  strategy: {
    defEn: "plan to achieve a goal",
    defEs: "plan para lograr un objetivo",
    example: "Our strategy is working.",
    exampleEs: "Nuestra estrategia funciona.",
  },
  negotiation: {
    defEn: "discussion to reach agreement",
    defEs: "discusión para llegar a un acuerdo",
    example: "The negotiation took three hours.",
    exampleEs: "La negociación duró tres horas.",
  },
  mitigate: {
    defEn: "to make less severe",
    defEs: "hacer menos grave",
    example: "We must mitigate the risks.",
    exampleEs: "Debemos mitigar los riesgos.",
  },
  hedge: {
    defEn: "to soften a claim",
    defEs: "suavizar una afirmación",
    example: "Writers hedge claims to seem cautious.",
    exampleEs: "Los autores matizan afirmaciones para parecer cautos.",
  },
  cleft: {
    defEn: "syntax that foregrounds part of a clause",
    defEs: "sintaxis que destaca una parte de la cláusula",
    example: "What matters is the evidence.",
    exampleEs: "Lo que importa es la evidencia.",
  },
  inversion: {
    defEn: "reversal of word order for emphasis",
    defEs: "inversión del orden para énfasis",
    example: "Never have I seen such clarity.",
    exampleEs: "Nunca he visto tal claridad.",
  },
  epistemology: {
    defEn: "study of knowledge",
    defEs: "estudio del conocimiento",
    example: "Epistemology shapes research questions.",
    exampleEs: "La epistemología moldea las preguntas de investigación.",
  },
  diplomacy: {
    defEn: "managing relations between groups",
    defEs: "gestión de relaciones entre grupos",
    example: "Diplomacy requires patience.",
    exampleEs: "La diplomacia requiere paciencia.",
  },
  leadership: {
    defEn: "ability to lead",
    defEs: "capacidad de liderar",
    example: "Good leadership inspires trust.",
    exampleEs: "El buen liderazgo inspira confianza.",
  },
};

// Fallback for unknown words
function vocabDetail(word: string): VocabDetail {
  const w = word.toLowerCase();
  if (WORD_DETAILS[w]) return WORD_DETAILS[w]!;
  if (WORD_DETAILS[w.split(" ")[0]!]) return WORD_DETAILS[w.split(" ")[0]!]!;
  return {
    defEn: `related to ${word}`,
    defEs: `relacionado con ${word}`,
    example: `We discussed ${word} in class.`,
    exampleEs: `Hablamos de ${word} en clase.`,
  };
}

// Unit vocab pools: 6 units * up to 10 words each per level (thematic)
const UNIT_VOCAB: Record<string, string[]> = {
  "A1-1": ["hello", "goodbye", "please", "thank you", "welcome", "introduce"],
  "A1-2": ["hello", "welcome", "introduce", "excuse", "morning", "evening", "please"],
  "A1-3": ["family", "mother", "father", "sister", "brother", "child", "house"],
  "A1-4": ["apple", "water", "bread", "coffee", "restaurant", "menu", "food"],
  "A1-5": ["house", "kitchen", "bedroom", "bathroom", "door", "window", "home"],
  "A1-6": ["morning", "evening", "day", "time", "work", "school", "family"],
  "A2-1": ["airport", "hotel", "ticket", "passport", "luggage", "travel", "time"],
  "A2-2": ["market", "price", "clothes", "money", "shopping", "welcome"],
  "A2-3": ["office", "meeting", "email", "work", "colleague", "schedule"],
  "A2-4": ["doctor", "health", "fitness", "exercise", "hospital", "medicine"],
  "A2-5": ["sun", "rain", "weather", "temperature", "cloud", "day"],
  "A2-6": ["music", "film", "culture", "art", "book", "sport"],
  "B1-1": ["meeting", "budget", "deadline", "report", "presentation", "office"],
  "B1-2": ["culture", "music", "film", "tradition", "media", "art"],
  "B1-3": ["school", "university", "lesson", "exam", "teacher", "education"],
  "B1-4": ["environment", "sustainable", "recycle", "pollution", "climate", "energy"],
  "B1-5": ["technology", "internet", "phone", "app", "data", "software"],
  "B1-6": ["society", "community", "opportunity", "challenge", "strategy", "negotiation"],
  "B2-1": ["academic", "research", "analysis", "evidence", "conclusion", "argument"],
  "B2-2": ["critical", "logic", "bias", "assumption", "perspective", "debate"],
  "B2-3": ["science", "experiment", "hypothesis", "innovation", "discovery", "laboratory"],
  "B2-4": ["gallery", "exhibition", "performance", "masterpiece", "creativity", "heritage"],
  "B2-5": ["climate", "poverty", "migration", "conflict", "cooperation", "sustainable"],
  "B2-6": ["leader", "team", "strategy", "vision", "decision", "leadership"],
  "C1-1": ["hedge", "cleft", "inversion", "stance", "thesis", "citation"],
  "C1-2": ["negotiation", "leverage", "proposal", "compromise", "contract", "stakeholder"],
  "C1-3": ["methodology", "sample", "variable", "correlation", "replication", "causation"],
  "C1-4": ["ethics", "dilemma", "principle", "value", "integrity", "accountability"],
  "C1-5": ["persuasion", "narrative", "framing", "bias", "audience", "rhetoric"],
  "C1-6": ["disruption", "scalability", "pivot", "roadmap", "synergy", "ecosystem"],
  "C2-1": ["idiom", "nuance", "register", "colloquial", "formal", "subtlety"],
  "C2-2": ["mastery", "expertise", "scholarship", "synthesis", "paradigm", "epistemology"],
  "C2-3": ["cleft", "inversion", "hedge", "mitigate", "elaborate", "nuance"],
  "C2-4": ["diplomacy", "protocol", "rapport", "consensus", "mediation", "intercultural"],
  "C2-5": ["publication", "peer review", "abstract", "journal", "citation", "plagiarism"],
  "C2-6": ["executive", "boardroom", "governance", "acquisition", "merger", "stakeholder"],
};

// Grammar points per unit (EN/ES)
const UNIT_GRAMMAR: Record<string, { en: string; es: string }> = {
  "A1-1": {
    en: "Alphabet, numbers, and present simple of 'be' (I am, you are) to introduce yourself.",
    es: "Alfabeto, números y presente de 'ser/estar' (I am, you are) para presentarte.",
  },
  "A1-2": {
    en: "Greetings and basic questions: 'What is your name?' and pronouns (I, you, he, she).",
    es: "Saludos y preguntas básicas: 'What is your name?' y pronombres (I, you, he, she).",
  },
  "A1-3": {
    en: "Possessives and family: my, your, his, her and 'have got' for family members.",
    es: "Posesivos y familia: my, your, his, her y 'have got' para miembros de la familia.",
  },
  "A1-4": {
    en: "Countable/uncountable and 'some/any' with food: 'Would you like some water?'",
    es: "Contables/incontables y 'some/any' con comida: 'Would you like some water?'",
  },
  "A1-5": {
    en: "There is / there are for rooms and furniture: 'There is a kitchen upstairs.'",
    es: "There is / there are para habitaciones y muebles: 'There is a kitchen upstairs.'",
  },
  "A1-6": {
    en: "Present simple for routines and adverbs of frequency: always, sometimes, never.",
    es: "Presente simple para rutinas y adverbios de frecuencia: always, sometimes, never.",
  },
  "A2-1": {
    en: "Past simple and travel questions: 'Where did you stay?' with ago and last.",
    es: "Pasado simple y preguntas de viaje: 'Where did you stay?' con ago y last.",
  },
  "A2-2": {
    en: "Comparatives and quantifiers in shopping: cheaper, more expensive, too, enough.",
    es: "Comparativos y cuantificadores en compras: cheaper, more expensive, too, enough.",
  },
  "A2-3": {
    en: "Present continuous vs simple for work arrangements: 'I'm meeting a client tomorrow.'",
    es: "Presente continuo vs simple para planes de trabajo: 'I'm meeting a client tomorrow.'",
  },
  "A2-4": {
    en: "Should / shouldn't and imperatives for health advice: 'You should rest.'",
    es: "Should / shouldn't e imperativos para consejos de salud: 'You should rest.'",
  },
  "A2-5": {
    en: "Going to and will for weather predictions: 'It will rain tomorrow.'",
    es: "Going to y will para predicciones del tiempo: 'It will rain tomorrow.'",
  },
  "A2-6": {
    en: "Like / love / enjoy + -ing for hobbies: 'I enjoy playing music.'",
    es: "Like / love / enjoy + -ing para aficiones: 'I enjoy playing music.'",
  },
  "B1-1": {
    en: "Modals for meetings and politeness: could, would, may for requests and hedging.",
    es: "Modales para reuniones y cortesía: could, would, may para peticiones y matización.",
  },
  "B1-2": {
    en: "Passive voice for culture and news: 'The film was directed in 2022.'",
    es: "Voz pasiva para cultura y noticias: 'The film was directed in 2022.'",
  },
  "B1-3": {
    en: "Reported speech and relative clauses in education: 'She said she had passed.'",
    es: "Estilo indirecto y oraciones relativas en educación: 'She said she had passed.'",
  },
  "B1-4": {
    en: "Conditionals I & II for environment: 'If we recycle, we will reduce waste.'",
    es: "Condicionales I y II para medio ambiente: 'If we recycle, we will reduce waste.'",
  },
  "B1-5": {
    en: "Future forms and articles with technology: 'The internet will change...'",
    es: "Formas de futuro y artículos con tecnología: 'The internet will change...'",
  },
  "B1-6": {
    en: "Linkers of contrast and addition in social topics: however, moreover, although.",
    es: "Conectores de contraste y adición en temas sociales: however, moreover, although.",
  },
  "B2-1": {
    en: "Hedging and academic stance: 'It seems that', 'arguably', tentative modals.",
    es: "Matización y postura académica: 'It seems that', 'arguably', modales tentativos.",
  },
  "B2-2": {
    en: "Coherence and counter-argument: 'On the one hand... however, the evidence suggests...'",
    es: "Coherencia y contraargumento: 'On the one hand... however, the evidence suggests...'",
  },
  "B2-3": {
    en: "Passive and nominalization in science: 'It was hypothesized that...'",
    es: "Pasiva y nominalización en ciencia: 'It was hypothesized that...'",
  },
  "B2-4": {
    en: "Clefts and emphasis in arts reviews: 'What struck me was the lighting.'",
    es: "Oraciones hendidas y énfasis en reseñas de arte: 'What struck me was the lighting.'",
  },
  "B2-5": {
    en: "Complex conditionals and concession for global issues: 'Even if...', 'Were we to...'",
    es: "Condicionales complejos y concesión para temas globales: 'Even if...', 'Were we to...'",
  },
  "B2-6": {
    en: "Modals of deduction and recommendation for leadership: 'must have', 'ought to'",
    es: "Modales de deducción y recomendación para liderazgo: 'must have', 'ought to'",
  },
  "C1-1": {
    en: "Advanced cohesion: clefts, inversion, and hedging to control stance and focus.",
    es: "Cohesión avanzada: hendidas, inversión y matización para controlar postura y foco.",
  },
  "C1-2": {
    en: "Pragmatics of negotiation: indirectness, cleft reframing, and politeness strategies.",
    es: "Pragmática de la negociación: indirección, reformulación con hendidas y cortesía.",
  },
  "C1-3": {
    en: "Reporting and hedging in research: 'What the data indicate is...' vs overstated claims.",
    es: "Citas y matización en investigación: 'What the data indicate is...' frente a afirmaciones exageradas.",
  },
  "C1-4": {
    en: "Abstract nouns and nominal style in ethics: 'The integrity of the process...'",
    es: "Sustantivos abstractos y estilo nominal en ética: 'The integrity of the process...'",
  },
  "C1-5": {
    en: "Rhetorical devices and stance markers: ethos, pathos, framing and evaluation.",
    es: "Recursos retóricos y marcadores de postura: ethos, pathos, encuadre y evaluación.",
  },
  "C1-6": {
    en: "Metaphor and business idioms for strategy: 'pivot', 'leverage', 'ecosystem'.",
    es: "Metáfora y modismos de negocio para estrategia: 'pivot', 'leverage', 'ecosystem'.",
  },
  "C2-1": {
    en: "Register shifting and idiomatic nuance: from colloquial 'cost an arm and a leg' to formal 'prohibitive cost'.",
    es: "Cambio de registro y matiz idiomático: de coloquial 'cost an arm and a leg' a formal 'prohibitive cost'.",
  },
  "C2-2": {
    en: "Synthesis and citation integration: 'Building on X, this paper argues...'",
    es: "Síntesis e integración de citas: 'Building on X, this paper argues...'",
  },
  "C2-3": {
    en: "Inversion and fronting for rhetorical punch: 'Not until...', 'So compelling was...'",
    es: "Inversión y anteposición para impacto retórico: 'Not until...', 'So compelling was...'",
  },
  "C2-4": {
    en: "Diplomatic hedging and face-saving: 'We might wish to consider...' vs direct refusal.",
    es: "Matización diplomática y preservación de imagen: 'We might wish to consider...' vs rechazo directo.",
  },
  "C2-5": {
    en: "Precision and concision in academic publishing: abstract moves, hedging, and citation style.",
    es: "Precisión y concisión en publicación académica: movimientos del resumen, matización y estilo de cita.",
  },
  "C2-6": {
    en: "Executive discourse: governance, M&A, and fiduciary language with appropriate formality.",
    es: "Discurso ejecutivo: gobernanza, fusiones y lenguaje fiduciario con formalidad adecuada.",
  },
};

// Key phrases per unit (EN/ES) — 4-5 per unit
const UNIT_PHRASES: Record<string, { en: string[]; es: string[] }> = {
  "A1-1": {
    en: ["Hello!", "What is your name?", "My name is ...", "How do you spell it?"],
    es: ["¡Hola!", "¿Cómo te llamas?", "Me llamo ...", "¿Cómo se escribe?"],
  },
  "A1-2": {
    en: ["Nice to meet you", "Good morning", "See you later", "Excuse me"],
    es: ["Encantado de conocerte", "Buenos días", "Nos vemos luego", "Perdone"],
  },
  "A1-3": {
    en: ["This is my family", "I have two sisters", "She is my mother", "We live together"],
    es: ["Esta es mi familia", "Tengo dos hermanas", "Ella es mi madre", "Vivimos juntos"],
  },
  "A1-4": {
    en: ["Can I have the menu?", "I would like coffee", "How much is it?", "The bill, please"],
    es: ["¿Me da el menú?", "Me gustaría un café", "¿Cuánto es?", "La cuenta, por favor"],
  },
  "A1-5": {
    en: ["There is a kitchen", "The house is big", "Where is the bathroom?", "On the first floor"],
    es: ["Hay una cocina", "La casa es grande", "¿Dónde está el baño?", "En la primera planta"],
  },
  "A1-6": {
    en: ["I get up at 7", "I always have breakfast", "In the evening I read", "At the weekend"],
    es: ["Me levanto a las 7", "Siempre desayuno", "Por la noche leo", "El fin de semana"],
  },
  "A2-1": {
    en: [
      "Where is the airport?",
      "I have a reservation",
      "What time does it leave?",
      "Can you help me?",
    ],
    es: [
      "¿Dónde está el aeropuerto?",
      "Tengo una reserva",
      "¿A qué hora sale?",
      "¿Puede ayudarme?",
    ],
  },
  "A2-2": {
    en: [
      "How much does it cost?",
      "Do you have a smaller size?",
      "It's too expensive",
      "I'll take it",
    ],
    es: ["¿Cuánto cuesta?", "¿Tiene una talla más pequeña?", "Es demasiado caro", "Me lo llevo"],
  },
  "A2-3": {
    en: [
      "Can we meet tomorrow?",
      "I'll send the email",
      "Let's schedule a call",
      "Thanks for your help",
    ],
    es: [
      "¿Podemos vernos mañana?",
      "Enviaré el correo",
      "Agendemos una llamada",
      "Gracias por tu ayuda",
    ],
  },
  "A2-4": {
    en: ["I feel sick", "You should see a doctor", "Take care", "Get well soon"],
    es: ["Me siento mal", "Deberías ver a un médico", "Cuídate", "Que te mejores"],
  },
  "A2-5": {
    en: ["It's sunny today", "It might rain", "What's the forecast?", "In summer it's hot"],
    es: ["Hoy hace sol", "Puede que llueva", "¿Qué dice el pronóstico?", "En verano hace calor"],
  },
  "A2-6": {
    en: ["I love music", "Do you like films?", "My hobby is painting", "Let's go to a concert"],
    es: [
      "Me encanta la música",
      "¿Te gustan las películas?",
      "Mi afición es pintar",
      "Vamos a un concierto",
    ],
  },
  "B1-1": {
    en: ["Could you elaborate?", "Let's align on this", "The deadline is tight", "I'll follow up"],
    es: [
      "¿Podría ampliarlo?",
      "Alineémonos en esto",
      "La fecha límite es ajustada",
      "Haré seguimiento",
    ],
  },
  "B1-2": {
    en: ["In my view", "The culture is diverse", "The film was moving", "I recommend visiting"],
    es: [
      "En mi opinión",
      "La cultura es diversa",
      "La película fue conmovedora",
      "Recomiendo visitar",
    ],
  },
  "B1-3": {
    en: [
      "She said she would come",
      "The course that I took",
      "Have you ever studied abroad?",
      "It depends on",
    ],
    es: ["Dijo que vendría", "El curso que hice", "¿Has estudiado en el extranjero?", "Depende de"],
  },
  "B1-4": {
    en: [
      "We should recycle",
      "If we act now, we will save...",
      "It's sustainable",
      "Reduce your footprint",
    ],
    es: [
      "Deberíamos reciclar",
      "Si actuamos ahora, salvaremos...",
      "Es sostenible",
      "Reduce tu huella",
    ],
  },
  "B1-5": {
    en: ["Have you updated the app?", "The data shows", "Stay tuned", "It went viral"],
    es: ["¿Has actualizado la app?", "Los datos muestran", "Mantente atento", "Se hizo viral"],
  },
  "B1-6": {
    en: ["However, others argue", "Moreover, studies show", "On the other hand", "In conclusion"],
    es: [
      "Sin embargo, otros argumentan",
      "Además, los estudios muestran",
      "Por otro lado",
      "En conclusión",
    ],
  },
  "B2-1": {
    en: [
      "The evidence suggests",
      "It could be argued that",
      "Arguably, ...",
      "The analysis indicates",
    ],
    es: [
      "La evidencia sugiere",
      "Podría argumentarse que",
      "Podría decirse que ...",
      "El análisis indica",
    ],
  },
  "B2-2": {
    en: ["On the one hand", "Conversely", "This assumption overlooks", "A more nuanced view"],
    es: ["Por un lado", "A la inversa", "Este supuesto pasa por alto", "Una visión más matizada"],
  },
  "B2-3": {
    en: [
      "The hypothesis was tested",
      "The results were replicated",
      "It was observed that",
      "Further research is needed",
    ],
    es: [
      "Se probó la hipótesis",
      "Se replicaron los resultados",
      "Se observó que",
      "Se necesita más investigación",
    ],
  },
  "B2-4": {
    en: [
      "What struck me was",
      "The exhibition explores",
      "A masterpiece of",
      "The performance was compelling",
    ],
    es: [
      "Lo que me llamó la atención fue",
      "La exposición explora",
      "Una obra maestra de",
      "La actuación fue convincente",
    ],
  },
  "B2-5": {
    en: [
      "Even if we act",
      "Were we to ignore",
      "Notwithstanding",
      "A coordinated response is needed",
    ],
    es: [
      "Incluso si actuamos",
      "Si ignorásemos",
      "No obstante",
      "Se necesita una respuesta coordinada",
    ],
  },
  "B2-6": {
    en: [
      "We need to align",
      "Let's take ownership",
      "The vision is clear",
      "Accountability matters",
    ],
    es: [
      "Necesitamos alinearnos",
      "Asumamos la responsabilidad",
      "La visión es clara",
      "La responsabilidad importa",
    ],
  },
  "C1-1": {
    en: [
      "What the study reveals is",
      "Not only does hedging signal...",
      "It is precisely...",
      "The claim is tentative",
    ],
    es: [
      "Lo que el estudio revela es",
      "No solo la matización indica...",
      "Es precisamente...",
      "La afirmación es tentativa",
    ],
  },
  "C1-2": {
    en: [
      "What we need is flexibility",
      "Could we explore alternatives?",
      "We might consider",
      "Let's find common ground",
    ],
    es: [
      "Lo que necesitamos es flexibilidad",
      "¿Podríamos explorar alternativas?",
      "Podríamos considerar",
      "Busquemos un terreno común",
    ],
  },
  "C1-3": {
    en: [
      "The sample was stratified",
      "Correlation is not causation",
      "Preregistration improves credibility",
      "Open data enables scrutiny",
    ],
    es: [
      "La muestra fue estratificada",
      "Correlación no es causalidad",
      "El preregistro mejora la credibilidad",
      "Los datos abiertos permiten escrutinio",
    ],
  },
  "C1-4": {
    en: [
      "The ethical dilemma is",
      "From a deontological view",
      "The principle of autonomy",
      "Accountability requires transparency",
    ],
    es: [
      "El dilema ético es",
      "Desde una visión deontológica",
      "El principio de autonomía",
      "La responsabilidad exige transparencia",
    ],
  },
  "C1-5": {
    en: [
      "The narrative frames",
      "This framing obscures",
      "The audience is positioned",
      "Rhetoric shapes perception",
    ],
    es: [
      "La narrativa enmarca",
      "Este encuadre oculta",
      "La audiencia es posicionada",
      "La retórica moldea la percepción",
    ],
  },
  "C1-6": {
    en: [
      "We need to pivot",
      "Leverage the ecosystem",
      "The roadmap is scalable",
      "Synergy across teams",
    ],
    es: [
      "Necesitamos pivotar",
      "Apalancar el ecosistema",
      "La hoja de ruta es escalable",
      "Sinergia entre equipos",
    ],
  },
  "C2-1": {
    en: [
      "Cost an arm and a leg (colloquial)",
      "Prohibitive cost (formal)",
      "It's a nuance",
      "Register matters",
    ],
    es: [
      "Costar un ojo de la cara (coloquial)",
      "Coste prohibitivo (formal)",
      "Es un matiz",
      "El registro importa",
    ],
  },
  "C2-2": {
    en: [
      "Building on prior work",
      "This synthesis argues",
      "The paradigm shifts",
      "Epistemology informs",
    ],
    es: [
      "Basándose en trabajos previos",
      "Esta síntesis argumenta",
      "El paradigma cambia",
      "La epistemología informa",
    ],
  },
  "C2-3": {
    en: [
      "Not until X can we Y",
      "So compelling was the evidence",
      "What mitigates risk is",
      "Rarely has clarity been so...",
    ],
    es: [
      "No hasta que X podamos Y",
      "Tan convincente fue la evidencia",
      "Lo que mitiga el riesgo es",
      "Rara vez la claridad ha sido tan...",
    ],
  },
  "C2-4": {
    en: [
      "We might wish to consider",
      "Perhaps we could revisit",
      "Consensus emerges when",
      "Mediation requires neutrality",
    ],
    es: [
      "Quizá quisiéramos considerar",
      "Quizá podríamos revisar",
      "El consenso surge cuando",
      "La mediación requiere neutralidad",
    ],
  },
  "C2-5": {
    en: [
      "The abstract should state",
      "Peer review ensures rigor",
      "Cite with precision",
      "Avoid plagiarism by paraphrasing",
    ],
    es: [
      "El resumen debe indicar",
      "La revisión por pares asegura rigor",
      "Cita con precisión",
      "Evita el plagio parafraseando",
    ],
  },
  "C2-6": {
    en: [
      "Governance and fiduciary duty",
      "The merger is contingent on",
      "Board approval is pending",
      "Stakeholder value",
    ],
    es: [
      "Gobernanza y deber fiduciario",
      "La fusión depende de",
      "La aprobación del consejo está pendiente",
      "Valor para las partes interesadas",
    ],
  },
};

// Lesson focus per lesson (vary within unit)
const LESSON_SUBTITLES: Record<string, string[]> = {
  "A1-1": [
    "Alphabet & Spelling",
    "Numbers & Counting",
    "Colours & Describing",
    "Personal Information",
  ],
  "A1-2": ["Meeting People", "Polite Phrases", "Asking for Help", "Saying Goodbye"],
  "A1-3": ["Immediate Family", "Extended Family", "Describing People", "Possessions"],
  "A1-4": ["At the Café", "Shopping for Food", "Preferences & Likes", "Bills & Prices"],
  "A1-5": ["Rooms & Furniture", "There is/are", "Directions Inside", "House vs Home"],
  "A1-6": ["Morning Routine", "Weekdays & Time", "Habits & Frequency", "Weekend Plans"],
  "A2-1": ["At the Airport", "Hotels & Reservations", "Asking Directions", "Transport & Tickets"],
  "A2-2": ["Markets & Prices", "Clothes & Sizes", "Bargaining", "Money & Payment"],
  "A2-3": ["Office Life", "Emails & Calls", "Arranging Meetings", "Work Routines"],
  "A2-4": ["Body & Symptoms", "Advice & Recommendations", "Fitness & Habits", "At the Pharmacy"],
  "A2-5": ["Seasons & Weather", "Forecasts", "Clothes for Weather", "Travel & Climate"],
  "A2-6": ["Music & Film", "Books & Art", "Sports & Games", "Weekend Hobbies"],
  "B1-1": ["Meetings & Agendas", "Emails & Politeness", "Deadlines & Reports", "Presentations"],
  "B1-2": ["Cultural Diversity", "Media & News", "Music & Film Reviews", "Traditions"],
  "B1-3": ["Learning & Memory", "Schools & Systems", "Study Abroad", "Exams & Feedback"],
  "B1-4": [
    "Climate & Energy",
    "Sustainable Habits",
    "Pollution & Solutions",
    "Debating Environment",
  ],
  "B1-5": ["Internet & Apps", "Data & Privacy", "Social Media", "Future of Tech"],
  "B1-6": ["Society & Change", "Linking Ideas", "Argument & Evidence", "Conclusions"],
  "B2-1": ["Academic Stance", "Hedging & Caution", "Citing Sources", "Conclusions"],
  "B2-2": ["Assumptions & Bias", "Counter-arguments", "Nuance & Balance", "Debate"],
  "B2-3": ["Hypotheses & Methods", "Data & Results", "Replication", "Future Research"],
  "B2-4": ["Reviews & Critique", "Exhibitions", "Performance", "Heritage & Value"],
  "B2-5": ["Global Problems", "Cooperation", "Conditional Solutions", "Persuasion"],
  "B2-6": ["Vision & Strategy", "Teams & Motivation", "Decisions & Risk", "Responsibility"],
  "C1-1": ["Cohesion & Focus", "Hedging", "Clefts", "Inversion"],
  "C1-2": ["Interests vs Positions", "Framing Needs", "Politeness & Power", "Closing Deals"],
  "C1-3": ["Variables & Samples", "Causation", "Preregistration", "Open Science"],
  "C1-4": ["Principles & Dilemmas", "Autonomy & Consent", "Integrity", "Accountability"],
  "C1-5": ["Framing & Narrative", "Audience & Purpose", "Ethos/Pathos", "Critical Reading"],
  "C1-6": ["Pivot & Scale", "Ecosystem & Synergy", "Roadmaps", "Execution"],
  "C2-1": ["Idioms & Collocation", "Formal vs Informal", "Connotation", "Subtlety"],
  "C2-2": ["Synthesis & Voice", "Paradigm & Theory", "Epistemology", "Argument"],
  "C2-3": ["Inversion for Emphasis", "Fronting", "Mitigation", "Elaboration"],
  "C2-4": ["Intercultural Awareness", "Consensus Building", "Mediation", "Protocol"],
  "C2-5": ["Abstract & Structure", "Citation & Paraphrase", "Peer Review", "Ethics"],
  "C2-6": ["Governance", "M&A Language", "Stakeholder & Value", "Execution"],
};

// ---------------------------------------------------------------------------
// Build enriched lesson content: 9 blocks as specified
// ---------------------------------------------------------------------------
function buildLessonContent(
  levelCode: string,
  unitTitle: string,
  unitIndex: number,
  lessonIndex: number,
): { blocks: unknown[] } {
  const unitKey = `${levelCode}-${unitIndex}`;
  const vocabPool = UNIT_VOCAB[unitKey] ?? ["hello", "thank you", "family"];
  const grammar = UNIT_GRAMMAR[unitKey] ?? {
    en: "See examples and practice.",
    es: "Ver ejemplos y practicar.",
  };
  const phrases = UNIT_PHRASES[unitKey] ?? { en: ["Hello", "Thank you"], es: ["Hola", "Gracias"] };
  const subtitles = LESSON_SUBTITLES[unitKey] ?? ["Topic A", "Topic B", "Topic C", "Topic D"];
  const focus = subtitles[(lessonIndex - 1) % subtitles.length]!;

  // Partition vocab per lesson into distinct chunks (sub-topics) using a sequential extended pool
  // Ensures L1..L4 within a unit do not repeat the same 3 words identically.
  const vocabCount = lessonIndex % 2 === 0 ? 4 : 3;
  const extendedPool = [...vocabPool, ...vocabPool, ...vocabPool];
  let cursor = 0;
  for (let k = 1; k < lessonIndex; k++) cursor += k % 2 === 0 ? 4 : 3;
  const selectedWords: string[] = extendedPool.slice(cursor, cursor + vocabCount);

  const unitNameEn = LEVEL_META[levelCode]!.unitNames[unitIndex - 1]!;
  const unitNameEs = LEVEL_META_ES[levelCode]![unitIndex - 1]!;

  const introEn = `Focus: ${focus} in the context of ${unitNameEn}. You will learn key vocabulary, grammar, and phrases to use in real situations.`;
  const introEs = `Enfoque: ${focus} en el contexto de ${unitNameEs}. Aprenderás vocabulario clave, gramática y frases para usar en situaciones reales.`;

  // Thematic alt/caption per lesson (not generic)
  const altEn = `${levelCode} ${unitNameEn} — ${focus} illustration, bright flat style`;
  const altEs = `${levelCode} ${unitNameEs} — ilustración de ${focus}, estilo plano luminoso`;
  const captionEn = `${unitNameEn}: ${focus} — ${levelCode} CEFR`;
  const captionEs = `${unitNameEs}: ${focus} — MCER ${levelCode}`;

  // Image uses per-lesson local path if we generated, else coverForLevel fallback is handled in seed idempotency but we reference thematic local
  const imageUrl = lessonImagePath(levelCode, unitIndex, lessonIndex);

  // Build vocab items bilingual
  const vocabItems = selectedWords.map((w) => {
    const d = vocabDetail(w);
    return {
      word: w,
      definition: d.defEn,
      definitionEs: d.defEs,
      example: d.example,
      exampleEs: d.exampleEs,
    };
  });

  // Two example sentences contextual
  const examples = (() => {
    if (levelCode.startsWith("C")) {
      return [
        {
          title: `Example — ${focus}`,
          titleEs: `Ejemplo — ${focus}`,
          text: `What the lesson shows is that "${focus.toLowerCase()}" shapes how we frame stance: use hedging and clefts to guide attention without overstating.`,
          textEs: `Lo que muestra la lección es que "${focus.toLowerCase()}" moldea cómo expresamos postura: usa matización y hendidas para guiar la atención sin exagerar.`,
        },
        {
          title: "Model sentence",
          titleEs: "Oración modelo",
          text: `Not until we apply ${selectedWords[0]} consistently can we claim progress on ${unitNameEn.toLowerCase()}.`,
          textEs: `No hasta que apliquemos ${selectedWords[0]} de forma consistente podremos afirmar progreso en ${unitNameEs.toLowerCase()}.`,
        },
      ];
    }
    if (levelCode.startsWith("B")) {
      return [
        {
          title: `Example — ${focus}`,
          titleEs: `Ejemplo — ${focus}`,
          text: `She explained that ${selectedWords[0]} is essential for ${unitNameEn.toLowerCase()}, and gave a clear example from her work.`,
          textEs: `Explicó que ${selectedWords[0]} es esencial para ${unitNameEs.toLowerCase()} y dio un ejemplo claro de su trabajo.`,
        },
        {
          title: "Useful pattern",
          titleEs: "Patrón útil",
          text: `If we focus on ${selectedWords[1] ?? selectedWords[0]}, we will improve our results in ${focus.toLowerCase()}.`,
          textEs: `Si nos centramos en ${selectedWords[1] ?? selectedWords[0]}, mejoraremos nuestros resultados en ${focus.toLowerCase()}.`,
        },
      ];
    }
    // A-level simple
    return [
      {
        title: `Example — ${focus}`,
        titleEs: `Ejemplo — ${focus}`,
        text: `This is my ${selectedWords[0]}. I use it every day in ${unitNameEn.toLowerCase()}.`,
        textEs: `Este es mi ${selectedWords[0]}. Lo uso cada día en ${unitNameEs.toLowerCase()}.`,
      },
      {
        title: " everyday sentence",
        titleEs: "Oración cotidiana",
        text: `She practices ${selectedWords[0]} every morning before work. It helps her remember new words.`,
        textEs: `Practica ${selectedWords[0]} cada mañana antes del trabajo. Le ayuda a recordar palabras nuevas.`,
      },
    ];
  })();

  const tipEn =
    levelCode.startsWith("A") || levelCode.startsWith("B")
      ? `Tip: read the examples aloud, then try the “Practice” exercises. Focus on ${focus.toLowerCase()} and the ${vocabCount} new words.`
      : `Tip: notice stance and register — compare direct vs hedged versions of the examples before you write.`;
  const tipEs =
    levelCode.startsWith("A") || levelCode.startsWith("B")
      ? `Consejo: lee los ejemplos en voz alta y luego haz los ejercicios de “Practicar”. Céntrate en ${focus.toLowerCase()} y las ${vocabCount} palabras nuevas.`
      : `Consejo: observa postura y registro — compara versiones directas y matizadas antes de escribir.`;

  // Key phrases list bilingual
  const listEn = phrases.en.slice(0, 4);
  const listEs = phrases.es.slice(0, 4);

  return {
    blocks: [
      {
        type: "heading",
        text: `${levelCode} · ${unitTitle} — Lesson ${lessonIndex}: ${focus}`,
        textEs: `${levelCode} · ${levelCode} Unidad ${unitIndex}: ${unitNameEs} — Lección ${lessonIndex}: ${focus}`,
        level: 2,
      },
      { type: "paragraph", text: introEn, textEs: introEs },
      { type: "paragraph", text: grammar.en, textEs: grammar.es },
      {
        type: "image",
        url: imageUrl,
        alt: altEn,
        altEs: altEs,
        caption: captionEn,
        captionEs: captionEs,
      },
      { type: "vocab", items: vocabItems },
      {
        type: "example",
        title: examples[0]!.title,
        titleEs: examples[0]!.titleEs,
        text: examples[0]!.text,
        textEs: examples[0]!.textEs,
      },
      {
        type: "example",
        title: examples[1]!.title,
        titleEs: examples[1]!.titleEs,
        text: examples[1]!.text,
        textEs: examples[1]!.textEs,
      },
      { type: "list", items: listEn, itemsEs: listEs, ordered: false },
      { type: "callout", text: tipEn, textEs: tipEs, variant: "tip" },
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
      imageUrl: flashcardLocalPath("apple"),
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: flashcardLocalPath("sustainable"),
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: flashcardLocalPath("mitigate"),
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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
      imageUrl: "/lesson-images/teaching-placeholder.png",
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

// ---------------------------------------------------------------------------
// Thematic exercise helpers — exercises are now built from the lesson's own vocab/phrases
// ---------------------------------------------------------------------------
function getAccumulatedVocab(levelCode: string, upToUnit: number): string[] {
  const all: string[] = [];
  for (let u = 1; u <= upToUnit; u++) {
    const key = `${levelCode}-${u}`;
    if (UNIT_VOCAB[key]) all.push(...UNIT_VOCAB[key]!);
  }
  // deduplicate preserving order
  return [...new Set(all)];
}

function difficultyForLevel(levelCode: string): number {
  if (levelCode.startsWith("C")) return 5;
  if (levelCode.startsWith("B")) return 3;
  return 1;
}

function thematicFlashcard(word: string, difficulty: number) {
  const d = vocabDetail(word);
  return {
    type: "flashcard" as const,
    prompt: {
      front: word,
      back: d.defEs,
      hint: d.defEn,
      imageUrl: flashcardLocalPath(word.toLowerCase()),
    },
    solution: { back: d.defEs },
    difficulty,
  };
}

function thematicFillBlanks(word: string, difficulty: number) {
  const d = vocabDetail(word);
  const sentence = d.example.includes(word)
    ? d.example.replace(new RegExp(word, "i"), "___")
    : `I use "${word}" (${d.defEn}) every day. I ___ it a lot.`;
  // ensure blank token exists
  const text = sentence.includes("___") ? sentence : `${sentence} Fill: ___`;
  return {
    type: "fill_blanks" as const,
    prompt: { text, blanks: [{ id: "b1", hint: `${word}: ${d.defEn}` }] },
    solution: { answers: { b1: [word, word.toLowerCase()] } },
    difficulty,
  };
}

function thematicMatching(words: string[], difficulty: number) {
  const slice = words.slice(0, Math.min(4, words.length));
  const pairs = slice.map((w, i) => ({ id: String(i + 1), left: w, right: vocabDetail(w).defEs }));
  return {
    type: "matching" as const,
    prompt: { pairs, imageUrl: "/lesson-images/teaching-placeholder.png" },
    solution: { pairs },
    difficulty,
  };
}

function thematicOrdering(words: string[], phrase: string, difficulty: number) {
  const d = vocabDetail(words[0] ?? phrase);
  const base = d.example || phrase;
  const tokens = base.split(" ").filter(Boolean);
  // deterministic shuffle: reverse + rotate for visibility but solution keeps correct order
  const shuffled = [...tokens].reverse();
  // ensure at least 3 tokens
  const finalTokens =
    shuffled.length >= 2 ? shuffled : [...words, ...phrase.split(" ")].slice(0, 5);
  return {
    type: "ordering" as const,
    prompt: { tokens: finalTokens, hint: `Order to form: "${base}"` },
    solution: { order: tokens },
    difficulty,
  };
}

function thematicListening(word: string, difficulty: number) {
  const d = vocabDetail(word);
  return {
    type: "listening_tts" as const,
    prompt: {
      text: d.example,
      question: `What did you hear about "${word}"?`,
      options: [d.example, "Different sentence"],
    },
    solution: { answer: d.example },
    difficulty,
  };
}

function thematicDictation(word: string, difficulty: number) {
  const d = vocabDetail(word);
  return {
    type: "dictation" as const,
    prompt: { text: d.example, playsAllowed: 2 },
    solution: { text: d.example },
    difficulty,
  };
}

function thematicComprehension(word: string, phrase: string, difficulty: number) {
  const d = vocabDetail(word);
  const passage = `${d.example} This is used when we talk about "${phrase}". The word "${word}" means ${d.defEn}.`;
  return {
    type: "comprehension" as const,
    prompt: {
      passage,
      question: `What does "${word}" mean?`,
      options: [d.defEs, "otra cosa", "ninguna"],
      imageUrl: "/lesson-images/teaching-placeholder.png",
    },
    solution: { answer: d.defEs },
    difficulty,
  };
}

function thematicGradedReading(
  words: string[],
  phrase: string,
  levelCode: string,
  difficulty: number,
) {
  const title = `Reading: ${phrase}`;
  const passage =
    words.map((w) => vocabDetail(w).example).join(" ") + ` In this context, "${phrase}" is common.`;
  const vocab = words.slice(0, 3).map((w) => ({ word: w, definition: vocabDetail(w).defEn }));
  const q1Word = words[0]!;
  const q1 = {
    id: "q1",
    question: `What does "${q1Word}" mean?`,
    options: [vocabDetail(q1Word).defEs, "otra definición"],
    answer: vocabDetail(q1Word).defEs,
  };
  const q2 = {
    id: "q2",
    question: `Which phrase appears in the text?`,
    options: [phrase, "Not in the text"],
    answer: phrase,
  };
  return {
    type: "graded_reading" as const,
    prompt: {
      title,
      passage,
      vocab,
      questions: [q1, q2],
      imageUrl: "/lesson-images/teaching-placeholder.png",
    },
    solution: { answers: { q1: q1.answer, q2: q2.answer } },
    difficulty: levelCode.startsWith("C") ? 5 : difficulty,
  };
}

function thematicWriting(words: string[], phrase: string, levelCode: string, difficulty: number) {
  const minWords = levelCode.startsWith("C") ? 80 : levelCode.startsWith("B") ? 50 : 20;
  const maxWords = levelCode.startsWith("C") ? 200 : levelCode.startsWith("B") ? 120 : 80;
  return {
    type: "writing_prompt" as const,
    prompt: {
      prompt: `Write ${minWords}-${maxWords} words using these words you learned: ${words.join(", ")}. Include the phrase "${phrase}".`,
      minWords,
      maxWords,
    },
    solution: {
      sampleAnswer: `I learned ${words.join(", ")} and I can use "${phrase}" in a sentence. ${words.map((w) => vocabDetail(w).example).join(" ")}`,
    },
    difficulty,
  };
}

function thematicSpeaking(word: string, difficulty: number) {
  const d = vocabDetail(word);
  return {
    type: "speaking_record" as const,
    prompt: { text: d.example, instruction: `Say a sentence with "${word}"` },
    solution: { reference: d.example },
    difficulty,
  };
}

function thematicShadowing(word: string, phrase: string, difficulty: number) {
  const ref = vocabDetail(word).example || phrase;
  return {
    type: "shadowing" as const,
    prompt: { reference: ref, speed: 1 },
    solution: { reference: ref },
    difficulty,
  };
}

function thematicPronunciation(word: string, difficulty: number) {
  const d = vocabDetail(word);
  return {
    type: "pronunciation" as const,
    prompt: { word, phonetic: `/${word}/`, example: d.example },
    solution: { word },
    difficulty,
  };
}

function thematicTransformation(word: string, difficulty: number) {
  const d = vocabDetail(word);
  return {
    type: "transformation" as const,
    prompt: { instruction: `Rewrite to include "${word}" (${d.defEn})`, sentence: d.example },
    solution: { accepted: [d.example] },
    difficulty,
  };
}

function buildThematicExercisesForLesson(opts: {
  levelCode: string;
  unitIndex: number;
  lessonIndex: number;
  kind: "teach" | "quiz" | "exam";
  lessonWords: string[];
  phrasesEn: string[];
  difficulty: number;
  perCount: number;
}): { type: string; prompt: unknown; solution: unknown; difficulty: number }[] {
  const { levelCode, lessonWords, phrasesEn, difficulty, perCount, kind } = opts;
  const words = lessonWords.length ? lessonWords : ["hello"];
  const phrase = phrasesEn[0] ?? `Use ${words[0]}`;

  // Build a rotating agenda of makers that guarantees prompt/solution contain lessonWords
  type Maker = () => { type: string; prompt: unknown; solution: unknown; difficulty: number };
  const makers: Maker[] = [];

  // Core thematic makers — each uses at least one lesson word
  makers.push(() => thematicFlashcard(words[0]!, difficulty));
  makers.push(() => thematicFillBlanks(words[0]!, difficulty));
  makers.push(() => thematicMatching(words, difficulty));
  makers.push(() => thematicOrdering(words, phrase, difficulty));
  // For B/C add heavier types, for A add listening/comprehension variety
  if (levelCode.startsWith("C")) {
    makers.push(() => thematicGradedReading(words, phrase, levelCode, difficulty));
    makers.push(() => thematicTransformation(words[0]!, difficulty));
    makers.push(() => thematicWriting(words, phrase, levelCode, difficulty));
    makers.push(() => thematicPronunciation(words[0]!, difficulty));
    makers.push(() => thematicShadowing(words[0]!, phrase, difficulty));
  } else if (levelCode.startsWith("B")) {
    makers.push(() => thematicComprehension(words[0]!, phrase, difficulty));
    makers.push(() => thematicListening(words[1] ?? words[0]!, difficulty));
    makers.push(() => thematicDictation(words[0]!, difficulty));
    makers.push(() => thematicGradedReading(words, phrase, levelCode, difficulty));
    makers.push(() => thematicWriting(words, phrase, levelCode, difficulty));
    makers.push(() => thematicTransformation(words[0]!, difficulty));
  } else {
    makers.push(() => thematicListening(words[0]!, difficulty));
    makers.push(() => thematicComprehension(words[0]!, phrase, difficulty));
    makers.push(() => thematicDictation(words[0]!, difficulty));
    makers.push(() => thematicSpeaking(words[0]!, difficulty));
    makers.push(() => thematicGradedReading(words, phrase, levelCode, difficulty));
  }

  // For quiz/exam add a distinct header: ensure coverage of accumulated words — rotate through accumulated set
  const result: { type: string; prompt: unknown; solution: unknown; difficulty: number }[] = [];
  for (let i = 0; i < perCount; i++) {
    const maker = makers[i % makers.length]!;
    // For quiz/exam, vary the word used by cycling through words array
    const variedWord = words[i % words.length]!;
    // Adjust maker word where applicable by wrapping maker that uses variedWord
    let item: any;
    if (i < makers.length) {
      item = maker();
    } else {
      // Cycle with varied word for diversity in review lessons
      const idx = i % 5;
      if (idx === 0) item = thematicFlashcard(variedWord, difficulty);
      else if (idx === 1) item = thematicFillBlanks(variedWord, difficulty);
      else if (idx === 2) item = thematicMatching(words, difficulty);
      else if (idx === 3) item = thematicComprehension(variedWord, phrase, difficulty);
      else item = thematicListening(variedWord, difficulty);
    }
    // Ensure phrase ordering for quiz alternates phrases
    if (kind !== "teach" && item.type === "ordering") {
      const altPhrase = phrasesEn[i % phrasesEn.length] ?? phrase;
      item = thematicOrdering(words, altPhrase, difficulty);
    }
    result.push(item);
  }
  // Ensure we keep legacy imageUrl fallback for renderers expecting it
  return (result as { type: string; prompt: unknown; solution: unknown; difficulty: number }[]).map(
    (ex: { type: string; prompt: unknown; solution: unknown; difficulty: number }) => {
      const p = ex.prompt as Record<string, unknown>;
      if (
        (ex.type === "graded_reading" || ex.type === "comprehension" || ex.type === "matching") &&
        !p["imageUrl"]
      ) {
        return { ...ex, prompt: { ...p, imageUrl: "/lesson-images/teaching-placeholder.png" } };
      }
      return ex;
    },
  ) as any;
}

const UNITS_PER_LEVEL = 6;
const LESSONS_PER_UNIT = 5;

async function seedLevel(levelCode: string) {
  console.log(`  -> seeding ${levelCode} ...`);
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
  const perTeach = levelCode.startsWith("C") ? 5 : levelCode.startsWith("B") ? 4 : 3;
  const perQuiz = levelCode.startsWith("C") ? 7 : levelCode.startsWith("B") ? 6 : 5;
  const perExam = levelCode.startsWith("C") ? 6 : 5;
  const difficulty = difficultyForLevel(levelCode);

  for (let ui = 1; ui <= UNITS_PER_LEVEL; ui++) {
    const unitCover = coverForLevel(levelCode);
    const unitTitleEn = `${levelCode} Unit ${ui}: ${meta.unitNames[ui - 1]}`;
    let unit = await prisma.unit.findFirst({ where: { levelId: level.id, orderIndex: ui } });
    if (!unit) {
      try {
        unit = await prisma.unit.create({
          data: {
            levelId: level.id,
            title: unitTitleEn,
            description: `Unit ${ui} for ${levelCode} — ${meta.unitNames[ui - 1]}`,
            orderIndex: ui,
            coverImage: unitCover,
          } as never,
        });
      } catch {
        unit = await prisma.unit.create({
          data: {
            levelId: level.id,
            title: unitTitleEn,
            description: `Unit ${ui} for ${levelCode} — ${meta.unitNames[ui - 1]}`,
            orderIndex: ui,
          },
        });
      }
    } else {
      // Update title/description if unitNames changed (enrichment) and migrate picsum -> local
      const curCover = (unit as unknown as { coverImage: string | null }).coverImage;
      const expectedTitle = unitTitleEn;
      const needsTitle = unit.title !== expectedTitle;
      const needsCover =
        !curCover || (typeof curCover === "string" && curCover.includes("picsum.photos"));
      if (needsTitle || needsCover) {
        try {
          unit = await prisma.unit.update({
            where: { id: unit.id },
            data: {
              ...(needsTitle
                ? {
                    title: expectedTitle,
                    description: `Unit ${ui} for ${levelCode} — ${meta.unitNames[ui - 1]}`,
                  }
                : {}),
              ...(needsCover ? { coverImage: unitCover } : {}),
            } as never,
          });
        } catch {}
      }
    }

    for (let li = 1; li <= LESSONS_PER_UNIT; li++) {
      const kind = lessonKindForUnit(li, LESSONS_PER_UNIT);
      const isQuiz = kind === "quiz";
      const isExam = false;
      const coverImage = coverForLevel(levelCode);
      const content = kind === "teach" ? buildLessonContent(levelCode, unitTitleEn, ui, li) : null;

      let lesson = await prisma.lesson.findFirst({ where: { unitId: unit.id, orderIndex: li } });
      if (!lesson) {
        try {
          lesson = await prisma.lesson.create({
            data: {
              unitId: unit.id,
              title: `Lesson ${li}${isQuiz ? " — Quiz" : ""}`,
              objectives: `Objectives for ${levelCode} U${ui} L${li}: ${meta.unitNames[ui - 1]} — ${LESSON_SUBTITLES[`${levelCode}-${ui}`]?.[li - 1] ?? "Practice"}`,
              orderIndex: li,
              estimatedMinutes: levelCode.startsWith("C")
                ? 20
                : levelCode.startsWith("B")
                  ? 15
                  : 10,
              isQuiz,
              isExam,
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
              isExam,
            },
          });
        }
      } else {
        // backfill / enrich existing rows — detect old poor content (6 blocks, goal/practice, generic alt)
        const curCover = (lesson as unknown as { coverImage: string | null }).coverImage;
        const curContent = (lesson as unknown as { content: unknown }).content as {
          blocks?: unknown[];
        } | null;
        const blocks = (curContent?.blocks ?? []) as unknown[];
        const hasOldVocab =
          JSON.stringify(curContent ?? "").includes('"goal"') ||
          JSON.stringify(curContent ?? "").includes('"practice"');
        const needsCover =
          !curCover || (typeof curCover === "string" && curCover.includes("picsum.photos"));
        const needsKind =
          !(lesson as unknown as { kind: unknown }).kind ||
          (lesson as unknown as { kind: unknown }).kind !== kind;
        const needsTitle = lesson.title !== `Lesson ${li}${isQuiz ? " — Quiz" : ""}`;
        const isTeachButPoor =
          kind === "teach" && (!curContent || blocks.length < 8 || hasOldVocab);
        const needsUpdate = needsKind || needsCover || needsTitle || isTeachButPoor;
        if (needsUpdate) {
          try {
            const updateData: Record<string, unknown> = {};
            if (needsKind) updateData.kind = kind;
            if (needsCover) updateData.coverImage = coverImage;
            if (needsTitle) {
              updateData.title = `Lesson ${li}${isQuiz ? " — Quiz" : ""}`;
              updateData.objectives = `Objectives for ${levelCode} U${ui} L${li}: ${meta.unitNames[ui - 1]} — ${LESSON_SUBTITLES[`${levelCode}-${ui}`]?.[li - 1] ?? "Practice"}`;
            }
            if (isTeachButPoor && content) updateData.content = content as never;
            else if (kind === "quiz" && curContent) updateData.content = null as never;
            // also ensure teach lessons have refreshed thematic image alt/caption even if blocks length ok but generic
            if (kind === "teach" && !isTeachButPoor && content) {
              // if existing alt is generic level alt, refresh to thematic
              const hasGenericAlt =
                JSON.stringify(curContent ?? "").includes("Two students greeting") ||
                JSON.stringify(curContent ?? "").includes("Local market scene");
              if (hasGenericAlt) updateData.content = content as never;
            }
            if (Object.keys(updateData).length) {
              lesson = await prisma.lesson.update({
                where: { id: lesson.id },
                data: updateData as never,
              });
            }
          } catch {}
        } else if (needsCover) {
          try {
            lesson = await prisma.lesson.update({
              where: { id: lesson.id },
              data: { coverImage } as never,
            });
          } catch {}
        }
      }

      // Thematic exercises aligned to lesson vocab — replaces generic template loop
      const unitKey = `${levelCode}-${ui}`;
      const perCountForKind = kind === "quiz" ? perQuiz : perTeach;

      // Derive lessonWords and phrasesEn per kind
      let lessonWords: string[] = [];
      let phrasesEn: string[] = [];
      if (kind === "teach") {
        const srcContent =
          (content as { blocks?: unknown[] } | null) ??
          ((lesson as unknown as { content: { blocks?: unknown[] } | null }).content as never);
        const blocks = ((srcContent as { blocks?: unknown[] })?.blocks ?? []) as Array<
          Record<string, unknown>
        >;
        const vocabBlock = blocks.find((b) => b.type === "vocab") as
          { items?: Array<{ word: string }> } | undefined;
        const extracted =
          vocabBlock?.items?.map((it) => String(it.word).toLowerCase()).filter(Boolean) ?? [];
        lessonWords = extracted.length
          ? extracted
          : (UNIT_VOCAB[unitKey] ?? ["hello"]).slice(0, 3).map((w) => w.toLowerCase());
        phrasesEn =
          UNIT_PHRASES[unitKey]?.en ??
          LESSON_SUBTITLES[unitKey] ??
          (LESSON_SUBTITLES[unitKey]?.[0] ? [LESSON_SUBTITLES[unitKey]![0]!] : ["Hello"]);
      } else {
        // quiz: accumulated vocab/phrases up to ui-1 (or ui if empty)
        let acc = getAccumulatedVocab(levelCode, ui - 1);
        if (!acc.length) acc = getAccumulatedVocab(levelCode, ui);
        if (!acc.length) acc = UNIT_VOCAB[unitKey] ?? ["hello"];
        lessonWords = acc.map((w) => w.toLowerCase());
        const accPhrases: string[] = [];
        for (let pu = 1; pu <= ui; pu++) {
          const k = `${levelCode}-${pu}`;
          if (UNIT_PHRASES[k]?.en) accPhrases.push(...UNIT_PHRASES[k]!.en);
          else if (LESSON_SUBTITLES[k]?.[0]) accPhrases.push(LESSON_SUBTITLES[k]![0]!);
        }
        phrasesEn = accPhrases.length ? accPhrases : (UNIT_PHRASES[unitKey]?.en ?? ["Review"]);
      }

      const thematicItems = buildThematicExercisesForLesson({
        levelCode,
        unitIndex: ui,
        lessonIndex: li,
        kind,
        lessonWords,
        phrasesEn,
        difficulty,
        perCount: perCountForKind,
      });

      const existingExercises = await prisma.exercise.findMany({
        where: { lessonId: lesson.id },
        orderBy: { id: "asc" },
      });

      const promptContainsLessonWord = (prompt: unknown, words: string[]): boolean => {
        if (!words.length) return true;
        const hay = JSON.stringify(prompt ?? "").toLowerCase();
        return words.some((w) => hay.includes(w.toLowerCase()));
      };

      if (existingExercises.length === 0) {
        for (const item of thematicItems) {
          await prisma.exercise.create({
            data: {
              lessonId: lesson.id,
              type: item.type as never,
              difficulty: item.difficulty,
              prompt: item.prompt as never,
              solution: item.solution as never,
              aiGenerated: false,
            },
          });
        }
      } else if (existingExercises.length < thematicItems.length) {
        // Patch poor existing then create missing
        for (let idx = 0; idx < existingExercises.length; idx++) {
          const ex = existingExercises[idx]!;
          const thematic = thematicItems[idx]!;
          const prompt = (ex.prompt ?? {}) as Record<string, unknown>;
          const isPoor = !promptContainsLessonWord(prompt, lessonWords);
          // legacy picsum flashcard -> fix imageUrl to local if thematic is flashcard
          let needsPatch = isPoor;
          let patchPrompt: Record<string, unknown> = {
            ...(thematic.prompt as Record<string, unknown>),
          };
          if (!isPoor) {
            // still fix missing imageUrl for reading/matching/comprehension
            if (
              (ex.type === "graded_reading" ||
                ex.type === "comprehension" ||
                ex.type === "matching") &&
              !prompt.imageUrl
            ) {
              patchPrompt = {
                ...(prompt as Record<string, unknown>),
                imageUrl: "/lesson-images/teaching-placeholder.png",
              };
              needsPatch = true;
            } else if (
              ex.type === "flashcard" &&
              typeof prompt.imageUrl === "string" &&
              (prompt.imageUrl as string).includes("picsum.photos")
            ) {
              const front = String((prompt.front as string) ?? lessonWords[0] ?? "apple");
              const local = flashcardLocalPath(front.toLowerCase());
              patchPrompt = { ...prompt, imageUrl: local };
              needsPatch = true;
            } else {
              needsPatch = false;
            }
          }
          if (needsPatch) {
            try {
              await prisma.exercise.update({
                where: { id: ex.id },
                data: {
                  type: thematic.type as never,
                  difficulty: thematic.difficulty,
                  prompt: patchPrompt as never,
                  solution: thematic.solution as never,
                },
              });
            } catch {}
          } else if (
            (thematic.type === "graded_reading" ||
              thematic.type === "comprehension" ||
              thematic.type === "matching") &&
            !(prompt as Record<string, unknown>).imageUrl
          ) {
            // ensure placeholder even when not poor
            try {
              await prisma.exercise.update({
                where: { id: ex.id },
                data: {
                  prompt: {
                    ...prompt,
                    imageUrl: "/lesson-images/teaching-placeholder.png",
                  } as never,
                },
              });
            } catch {}
          }
        }
        for (let idx = existingExercises.length; idx < thematicItems.length; idx++) {
          const item = thematicItems[idx]!;
          await prisma.exercise.create({
            data: {
              lessonId: lesson.id,
              type: item.type as never,
              difficulty: item.difficulty,
              prompt: item.prompt as never,
              solution: item.solution as never,
              aiGenerated: false,
            },
          });
        }
      } else {
        // existing >= expected: if poor or over-count, realign first N to thematic; trim excess if any
        let poorCount = 0;
        for (const ex of existingExercises) {
          const prompt = (ex.prompt ?? {}) as Record<string, unknown>;
          if (!promptContainsLessonWord(prompt, lessonWords)) poorCount++;
        }
        const isOver = existingExercises.length > thematicItems.length;
        if (poorCount > 0 || isOver) {
          // Deterministic realignment: update first thematicItems.length exercises to thematic
          for (let idx = 0; idx < thematicItems.length; idx++) {
            const ex = existingExercises[idx]!;
            const thematic = thematicItems[idx]!;
            const prompt = (ex.prompt ?? {}) as Record<string, unknown>;
            const isPoor = !promptContainsLessonWord(prompt, lessonWords);
            // update if poor or if type/difficulty drifted (ensures C=5 B=4 A=3 perTeach alignment)
            const needsUpdate =
              isPoor ||
              ex.type !== thematic.type ||
              (ex as unknown as { difficulty: number }).difficulty !== thematic.difficulty;
            if (needsUpdate) {
              try {
                await prisma.exercise.update({
                  where: { id: ex.id },
                  data: {
                    type: thematic.type as never,
                    difficulty: thematic.difficulty,
                    prompt: thematic.prompt as never,
                    solution: thematic.solution as never,
                  },
                });
              } catch {}
            }
          }
          // Delete surplus exercises to keep idempotent count (if over)
          if (isOver) {
            const surplus = existingExercises.slice(thematicItems.length);
            for (const ex of surplus) {
              try {
                await prisma.exercise.delete({ where: { id: ex.id } });
              } catch {}
            }
          }
        } else {
          // Count correct and thematic — only backfill missing imageUrl if needed
          for (const ex of existingExercises) {
            const prompt = (ex.prompt ?? {}) as Record<string, unknown>;
            if (
              (ex.type === "graded_reading" ||
                ex.type === "comprehension" ||
                ex.type === "matching") &&
              !prompt.imageUrl
            ) {
              try {
                await prisma.exercise.update({
                  where: { id: ex.id },
                  data: {
                    prompt: {
                      ...prompt,
                      imageUrl: "/lesson-images/teaching-placeholder.png",
                    } as never,
                  },
                });
              } catch {}
            }
            if (
              ex.type === "flashcard" &&
              typeof prompt.imageUrl === "string" &&
              (prompt.imageUrl as string).includes("picsum.photos")
            ) {
              const front = String((prompt.front as string) ?? lessonWords[0] ?? "apple");
              const local = flashcardLocalPath(front.toLowerCase());
              try {
                await prisma.exercise.update({
                  where: { id: ex.id },
                  data: { prompt: { ...prompt, imageUrl: local } as never },
                });
              } catch {}
            }
          }
        }
      }
    }
  }

  // Level exam unit (orderIndex 99) — 1 exam lesson, plus optional second for C levels
  let examUnit = await prisma.unit.findFirst({ where: { levelId: level.id, orderIndex: 99 } });
  if (!examUnit) {
    try {
      examUnit = await prisma.unit.create({
        data: {
          levelId: level.id,
          title: `${levelCode} Final Exam`,
          description: `Final exam for ${levelCode}`,
          orderIndex: 99,
          coverImage: coverForLevel(levelCode),
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
  } else {
    const cur = (examUnit as unknown as { coverImage: string | null }).coverImage;
    if (!cur || cur.includes("picsum.photos")) {
      try {
        await prisma.unit.update({
          where: { id: examUnit.id },
          data: { coverImage: coverForLevel(levelCode) } as never,
        });
      } catch {}
    }
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
          coverImage: coverForLevel(levelCode),
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
  } else {
    const needsKind = !(examLesson as unknown as { kind: unknown }).kind;
    const curCover = (examLesson as unknown as { coverImage: string | null }).coverImage;
    const needsCover =
      !curCover || (typeof curCover === "string" && curCover.includes("picsum.photos"));
    if (needsKind || needsCover) {
      try {
        await prisma.lesson.update({
          where: { id: examLesson.id },
          data: {
            ...(needsKind ? { kind: "exam" as never } : {}),
            ...(needsCover ? { coverImage: coverForLevel(levelCode) } : {}),
          } as never,
        });
      } catch {}
    }
  }
  // Thematic exam — aligned to accumulated vocab/phrases + perExam count
  {
    const examWords = getAccumulatedVocab(levelCode, UNITS_PER_LEVEL);
    const examPhrases: string[] = [];
    for (let pu = 1; pu <= UNITS_PER_LEVEL; pu++) {
      const k = `${levelCode}-${pu}`;
      if (UNIT_PHRASES[k]?.en) examPhrases.push(...UNIT_PHRASES[k]!.en);
    }
    const safeExamWords = examWords.length
      ? examWords
      : (UNIT_VOCAB[`${levelCode}-1`] ?? ["hello"]);
    const safeExamPhrases = examPhrases.length ? examPhrases : ["Final review"];
    const thematicExam = buildThematicExercisesForLesson({
      levelCode,
      unitIndex: 99,
      lessonIndex: 1,
      kind: "exam",
      lessonWords: safeExamWords,
      phrasesEn: safeExamPhrases,
      difficulty,
      perCount: perExam,
    });
    const existingExam = await prisma.exercise.findMany({
      where: { lessonId: examLesson.id },
      orderBy: { id: "asc" },
    });
    const containsWord = (prompt: unknown, words: string[]) => {
      const hay = JSON.stringify(prompt ?? "").toLowerCase();
      return words.some((w) => hay.includes(w.toLowerCase()));
    };
    if (existingExam.length === 0) {
      for (const item of thematicExam) {
        await prisma.exercise.create({
          data: {
            lessonId: examLesson.id,
            type: item.type as never,
            difficulty: item.difficulty,
            prompt: item.prompt as never,
            solution: item.solution as never,
          },
        });
      }
    } else if (existingExam.length < thematicExam.length) {
      let poor = 0;
      for (let i = 0; i < existingExam.length; i++) {
        if (
          !containsWord((existingExam[i] as unknown as { prompt: unknown }).prompt, safeExamWords)
        )
          poor++;
      }
      if (poor > 0) {
        for (let i = 0; i < existingExam.length; i++) {
          const ex = existingExam[i]!;
          if (!containsWord((ex as unknown as { prompt: unknown }).prompt, safeExamWords)) {
            const th = thematicExam[i]!;
            try {
              await prisma.exercise.update({
                where: { id: ex.id },
                data: {
                  type: th.type as never,
                  difficulty: th.difficulty,
                  prompt: th.prompt as never,
                  solution: th.solution as never,
                },
              });
            } catch {}
          }
        }
      }
      for (let i = existingExam.length; i < thematicExam.length; i++) {
        const item = thematicExam[i]!;
        await prisma.exercise.create({
          data: {
            lessonId: examLesson.id,
            type: item.type as never,
            difficulty: item.difficulty,
            prompt: item.prompt as never,
            solution: item.solution as never,
          },
        });
      }
    } else {
      let poorCount = 0;
      for (const ex of existingExam) {
        if (!containsWord((ex as unknown as { prompt: unknown }).prompt, safeExamWords))
          poorCount++;
      }
      const isOver = existingExam.length > thematicExam.length;
      if (poorCount > 0 || isOver) {
        for (let i = 0; i < thematicExam.length; i++) {
          const ex = existingExam[i]!;
          const th = thematicExam[i]!;
          const isPoor = !containsWord(
            (ex as unknown as { prompt: unknown }).prompt,
            safeExamWords,
          );
          const needsUpdate =
            isPoor ||
            ex.type !== th.type ||
            (ex as unknown as { difficulty: number }).difficulty !== th.difficulty;
          if (needsUpdate) {
            try {
              await prisma.exercise.update({
                where: { id: ex.id },
                data: {
                  type: th.type as never,
                  difficulty: th.difficulty,
                  prompt: th.prompt as never,
                  solution: th.solution as never,
                },
              });
            } catch {}
          }
        }
        if (isOver) {
          for (const ex of existingExam.slice(thematicExam.length)) {
            try {
              await prisma.exercise.delete({ where: { id: (ex as unknown as { id: string }).id } });
            } catch {}
          }
        }
      }
    }
  }
  console.log(`  <- done ${levelCode}`);
  // Optional second exam for C levels — thematic, idempotent
  if (levelCode.startsWith("C")) {
    let examLesson2 = await prisma.lesson.findFirst({
      where: { unitId: examUnit.id, orderIndex: 2 },
    });
    if (!examLesson2) {
      try {
        examLesson2 = await prisma.lesson.create({
          data: {
            unitId: examUnit.id,
            title: `${levelCode} Final Exam — Part 2`,
            objectives: `Second comprehensive exam for ${levelCode}`,
            orderIndex: 2,
            estimatedMinutes: 30,
            isQuiz: false,
            isExam: true,
            kind: "exam" as never,
            coverImage: coverForLevel(levelCode),
            content: null as never,
          } as never,
        });
      } catch {
        examLesson2 = await prisma.lesson.create({
          data: {
            unitId: examUnit.id,
            title: `${levelCode} Final Exam — Part 2`,
            objectives: `Second exam for ${levelCode}`,
            orderIndex: 2,
            estimatedMinutes: 30,
            isQuiz: false,
            isExam: true,
          },
        });
      }
    }
    // Ensure thematic exercises for part 2 (even if lesson already existed)
    {
      const examWords2 = getAccumulatedVocab(levelCode, UNITS_PER_LEVEL);
      const examPhrases2: string[] = [];
      for (let pu = 1; pu <= UNITS_PER_LEVEL; pu++) {
        const k = `${levelCode}-${pu}`;
        if (UNIT_PHRASES[k]?.en) examPhrases2.push(...UNIT_PHRASES[k]!.en);
      }
      const safeWords2 = examWords2.length
        ? examWords2
        : (UNIT_VOCAB[`${levelCode}-1`] ?? ["hello"]);
      const safePhrases2 = examPhrases2.length ? examPhrases2 : ["Final review part 2"];
      const thematicExam2 = buildThematicExercisesForLesson({
        levelCode,
        unitIndex: 99,
        lessonIndex: 2,
        kind: "exam",
        lessonWords: safeWords2,
        phrasesEn: safePhrases2,
        difficulty,
        perCount: perExam,
      });
      const existing2 = await prisma.exercise.findMany({
        where: { lessonId: examLesson2.id },
        orderBy: { id: "asc" },
      });
      const containsWord2 = (prompt: unknown, words: string[]) => {
        const hay = JSON.stringify(prompt ?? "").toLowerCase();
        return words.some((w) => hay.includes(w.toLowerCase()));
      };
      if (existing2.length === 0) {
        for (const item of thematicExam2) {
          await prisma.exercise.create({
            data: {
              lessonId: examLesson2.id,
              type: item.type as never,
              difficulty: item.difficulty,
              prompt: item.prompt as never,
              solution: item.solution as never,
            },
          });
        }
      } else if (existing2.length < thematicExam2.length) {
        for (let i = 0; i < existing2.length; i++) {
          if (!containsWord2((existing2[i] as unknown as { prompt: unknown }).prompt, safeWords2)) {
            const th = thematicExam2[i]!;
            try {
              await prisma.exercise.update({
                where: { id: (existing2[i] as unknown as { id: string }).id },
                data: {
                  type: th.type as never,
                  difficulty: th.difficulty,
                  prompt: th.prompt as never,
                  solution: th.solution as never,
                },
              });
            } catch {}
          }
        }
        for (let i = existing2.length; i < thematicExam2.length; i++) {
          const item = thematicExam2[i]!;
          await prisma.exercise.create({
            data: {
              lessonId: examLesson2.id,
              type: item.type as never,
              difficulty: item.difficulty,
              prompt: item.prompt as never,
              solution: item.solution as never,
            },
          });
        }
      } else {
        let poorCount2 = 0;
        for (const ex of existing2) {
          if (!containsWord2((ex as unknown as { prompt: unknown }).prompt, safeWords2))
            poorCount2++;
        }
        const isOver2 = existing2.length > thematicExam2.length;
        if (poorCount2 > 0 || isOver2) {
          for (let i = 0; i < thematicExam2.length; i++) {
            const ex = existing2[i]!;
            const th = thematicExam2[i]!;
            const isPoor = !containsWord2(
              (ex as unknown as { prompt: unknown }).prompt,
              safeWords2,
            );
            const needsUpdate =
              isPoor ||
              ex.type !== th.type ||
              (ex as unknown as { difficulty: number }).difficulty !== th.difficulty;
            if (needsUpdate) {
              try {
                await prisma.exercise.update({
                  where: { id: (ex as unknown as { id: string }).id },
                  data: {
                    type: th.type as never,
                    difficulty: th.difficulty,
                    prompt: th.prompt as never,
                    solution: th.solution as never,
                  },
                });
              } catch {}
            }
          }
          if (isOver2) {
            for (const ex of existing2.slice(thematicExam2.length)) {
              try {
                await prisma.exercise.delete({
                  where: { id: (ex as unknown as { id: string }).id },
                });
              } catch {}
            }
          }
        }
      }
    }
  }
}

async function seedPrdStrict(seed: number) {
  console.log(`[seed] PRD strict mode seed=${seed} — generating 72 lessons + 72 quizzes`);
  const lessons = generateLessons(seed);
  const quizzes = generateQuizzes(lessons, seed);
  const quizByLesson = new Map(quizzes.map((q) => [q.lessonId, q]));
  for (const dto of lessons) {
    const { level, mod, les } = parsePrdId(dto.id_leccion);
    const levelRec = await prisma.level.upsert({
      where: { code: level as never },
      update: {},
      create: {
        code: level as never,
        title: `${level} Level`,
        description: `CEFR ${level}`,
        orderIndex: ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(level) + 1,
      },
    });
    // unit/module upsert by levelId+orderIndex
    const themeEn = dto.titulo.en.split(":").slice(1).join(":").trim() || `Module ${mod}`;
    let unit = await prisma.unit.findFirst({ where: { levelId: levelRec.id, orderIndex: mod } });
    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          levelId: levelRec.id,
          title: `${level} Module ${mod}`,
          description: themeEn,
          orderIndex: mod,
          coverImage: `/lesson-images/${canonicalForLesson(dto.id_leccion)}`,
        } as never,
      });
    } else {
      try {
        await prisma.unit.update({
          where: { id: unit.id },
          data: { coverImage: `/lesson-images/${canonicalForLesson(dto.id_leccion)}` } as never,
        });
      } catch {}
    }
    // lesson upsert by unitId+orderIndex (maps to id_leccion)
    let lesson = await prisma.lesson.findFirst({ where: { unitId: unit.id, orderIndex: les } });
    const cover = `/lesson-images/${dto.ilustraciones_asociadas[0] ?? canonicalForLesson(dto.id_leccion)}`;
    // content mirrors LessonDTO for teaching rendering
    const content: unknown = {
      blocks: [
        { type: "heading", text: dto.titulo.en, textEs: dto.titulo.es, level: 2 },
        { type: "paragraph", text: dto.objetivo, textEs: dto.objetivo },
        { type: "paragraph", text: dto.explicacion_gramatical, textEs: dto.explicacion_gramatical },
        {
          type: "image",
          url: cover,
          alt: `${level} M${mod} L${les} illustration`,
          altEs: `${level} M${mod} L${les} ilustración`,
          caption: dto.titulo.en,
          captionEs: dto.titulo.es,
        },
        { type: "vocab", items: dto.vocabulario_clave },
        {
          type: "list",
          items: dto.vocabulario_clave.map((v) => v.word),
          itemsEs: dto.vocabulario_clave.map((v) => v.word),
          ordered: false,
        },
      ],
    };
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
          unitId: unit.id,
          title: dto.titulo.en,
          objectives: dto.objetivo,
          orderIndex: les,
          estimatedMinutes: level.startsWith("C") ? 20 : level.startsWith("B") ? 15 : 10,
          kind: "teach" as never,
          coverImage: cover,
          content: content as never,
        } as never,
      });
    } else {
      try {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: {
            title: dto.titulo.en,
            objectives: dto.objetivo,
            coverImage: cover,
            content: content as never,
            kind: "teach" as never,
          } as never,
        });
      } catch {}
    }
    // quiz exercises idempotent by lessonId (delete surplus then upsert 5)
    const quiz = quizByLesson.get(dto.id_leccion);
    if (quiz) {
      const existing = await prisma.exercise.findMany({
        where: { lessonId: lesson.id },
        orderBy: { id: "asc" },
      });
      // keep first 5 as quiz questions (prd_strict lessons have exactly 5 quiz exercises)
      // remove if more than 5 or legacy shape mismatch
      if (existing.length !== 5) {
        for (const ex of existing)
          try {
            await prisma.exercise.delete({ where: { id: ex.id } });
          } catch {}
        for (let i = 0; i < quiz.questions.length; i++) {
          const q = quiz.questions[i]!;
          const prompt: Record<string, unknown> = {
            prompt: q.prompt,
            options: (q as unknown as { options?: unknown }).options,
            imageUrl: (q as unknown as { image_ref?: string }).image_ref
              ? `/lesson-images/${(q as unknown as { image_ref: string }).image_ref}`
              : undefined,
          };
          await prisma.exercise.create({
            data: {
              lessonId: lesson.id,
              type: q.type as never,
              difficulty: 2,
              prompt: prompt as never,
              solution: { answer: (q as unknown as { answer?: string }).answer } as never,
            } as never,
          });
        }
      } else {
        // update in place to keep idempotent
        for (let i = 0; i < 5; i++) {
          const q = quiz.questions[i]!;
          const ex = existing[i]!;
          try {
            await prisma.exercise.update({
              where: { id: ex.id },
              data: {
                type: q.type as never,
                prompt: {
                  prompt: q.prompt,
                  options: (q as unknown as { options?: unknown }).options,
                  imageUrl: (q as unknown as { image_ref?: string }).image_ref
                    ? `/lesson-images/${(q as unknown as { image_ref: string }).image_ref}`
                    : undefined,
                } as never,
                solution: { answer: (q as unknown as { answer?: string }).answer } as never,
              } as never,
            });
          } catch {}
        }
      }
    }
  }
  // prune legacy units 5,6,99 so count =72
  for (const code of ["A1", "A2", "B1", "B2", "C1", "C2"] as const) {
    const lvl = await prisma.level.findFirst({ where: { code: code as never } });
    if (!lvl) continue;
    try {
      await prisma.unit.deleteMany({ where: { levelId: lvl.id, orderIndex: { gt: 4 } } });
    } catch {}
    // also delete units beyond 4 that might have been created as 99 exam — already covered by gt 4
  }
  console.log(`[seed] prd_strict done lessons=${lessons.length} quizzes=${quizzes.length}`);
}

async function main() {
  const { mode: argMode, seed: argSeed } = parseArgsSeed();
  const mode = getCurriculumMode(argMode);
  const seed = argSeed ?? Number(process.env.CURRICULUM_SEED ?? 42);
  if (mode === "prd_strict") {
    await seedPrdStrict(seed);
  } else {
    console.log("Seeding A1..C2 (enriched 6 units x 5 lessons)...");
    for (const code of ["A1", "A2", "B1", "B2", "C1", "C2"] as const) await seedLevel(code);
  }

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
      description: "Calm ocean blues — equip to change theme",
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
      description: "Show off — 'Legend' title badge",
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
    // --- New items (Fix-11-D) 9 extra → total 18 ---
    {
      title: "Theme: Midnight",
      description: "Deep navy midnight — dark theme variant",
      priceXp: 280,
      cosmeticType: "theme",
      assetUrl: "/lesson-images/shop/theme-midnight.png",
      rarity: "rare",
      isPremium: false,
    },
    {
      title: "Theme: Forest",
      description: "Forest greens — nature calm",
      priceXp: 300,
      cosmeticType: "theme",
      assetUrl: "/lesson-images/shop/theme-forest.png",
      rarity: "rare",
      isPremium: false,
    },
    {
      title: "Theme: Sunset",
      description: "Warm sunset oranges — vibrant theme",
      priceXp: 350,
      cosmeticType: "theme",
      assetUrl: "/lesson-images/shop/theme-sunset.png",
      rarity: "epic",
      isPremium: false,
    },
    {
      title: "Theme: Aurora",
      description: "Aurora borealis — premium glow",
      priceXp: 500,
      cosmeticType: "theme",
      assetUrl: "/lesson-images/shop/theme-aurora.png",
      rarity: "legendary",
      isPremium: false,
    },
    {
      title: "Avatar Glasses",
      description: "Smart glasses for your avatar",
      priceXp: 180,
      cosmeticType: "avatar",
      assetUrl: "/lesson-images/shop/avatar-glasses.png",
      rarity: "common",
      isPremium: false,
    },
    {
      title: "Avatar Cape",
      description: "Hero cape — epic flair",
      priceXp: 320,
      cosmeticType: "avatar",
      assetUrl: "/lesson-images/shop/avatar-cape.png",
      rarity: "epic",
      isPremium: false,
    },
    {
      title: "Background: Library",
      description: "Cozy library — profile background",
      priceXp: 250,
      cosmeticType: "background",
      assetUrl: "/lesson-images/shop/background-library.png",
      rarity: "rare",
      isPremium: false,
    },
    {
      title: "Background: Space",
      description: "Space nebula — out of this world",
      priceXp: 350,
      cosmeticType: "background",
      assetUrl: "/lesson-images/shop/background-space.png",
      rarity: "epic",
      isPremium: false,
    },
    {
      title: "Effect: Fireworks",
      description: "Fireworks burst on level up",
      priceXp: 380,
      cosmeticType: "effect",
      assetUrl: "/lesson-images/shop/effect-fireworks.png",
      rarity: "rare",
      isPremium: false,
    },
    {
      title: "Title: Polyglot",
      description: "Title badge — Polyglot Master",
      priceXp: 450,
      cosmeticType: "title",
      assetUrl: "/lesson-images/shop/title-polyglot.png",
      rarity: "legendary",
      isPremium: false,
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

  const lessonCount = await prisma.lesson.count();
  const exerciseCount = await prisma.exercise.count();
  console.log(
    `Seed complete A1..C2: lessons=${lessonCount} exercises=${exerciseCount} (target ~186 lessons)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
