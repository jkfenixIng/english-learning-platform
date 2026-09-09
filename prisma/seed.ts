import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  // Rotate vocab per lesson: 3-4 items, offset by lessonIndex
  const vocabCount = lessonIndex % 2 === 0 ? 4 : 3;
  const offset = (lessonIndex - 1) * vocabCount;
  const selectedWords: string[] = [];
  for (let i = 0; i < vocabCount; i++)
    selectedWords.push(vocabPool[(offset + i) % vocabPool.length]!);

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
  const perLessonCount = levelCode.startsWith("C") ? 5 : levelCode.startsWith("B") ? 4 : 3;

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

      // Ensure exercises — perLessonCount, plus image fallback for reading/matching/comprehension
      const startIdx = ((ui - 1) * perLessonCount + (li - 1) * perLessonCount) % templates.length;
      for (let ei = 0; ei < perLessonCount; ei++) {
        const tmpl = templates[(startIdx + ei) % templates.length]!;
        const existing = await prisma.exercise.findFirst({
          where: { lessonId: lesson.id, type: tmpl.type as never },
        });
        if (existing) {
          // backfill imageUrl for legacy flashcard/picsum or missing hero
          const prompt = (existing.prompt ?? {}) as Record<string, unknown>;
          let needsPatch = false;
          const patchPrompt: Record<string, unknown> = { ...prompt };
          if (
            tmpl.type === "flashcard" &&
            typeof prompt.imageUrl === "string" &&
            (prompt.imageUrl as string).includes("picsum.photos")
          ) {
            const front = (prompt.front as string) || "apple";
            const local = flashcardLocalPath(front.toLowerCase());
            // keep picsum fallback via renderer onError, but prefer local if in allowlist
            if (
              FLASHCARD_LOCAL_WORDS.has(front.toLowerCase()) ||
              front.toLowerCase().includes("apple") ||
              front.toLowerCase().includes("sustainable") ||
              front.toLowerCase().includes("mitigate")
            ) {
              patchPrompt.imageUrl = local;
              needsPatch = true;
            }
          }
          if (
            (tmpl.type === "graded_reading" ||
              tmpl.type === "comprehension" ||
              tmpl.type === "matching") &&
            !prompt.imageUrl &&
            !(prompt as unknown as { images?: unknown }).images
          ) {
            patchPrompt.imageUrl = "/lesson-images/teaching-placeholder.png";
            needsPatch = true;
          }
          if (needsPatch) {
            try {
              await prisma.exercise.update({
                where: { id: existing.id },
                data: { prompt: patchPrompt as never },
              });
            } catch {}
          }
          continue;
        }
        // create new exercise with prompt image fallback if needed
        const basePrompt = tmpl.prompt as Record<string, unknown>;
        const promptWithImage: Record<string, unknown> = { ...basePrompt };
        if (
          (tmpl.type === "graded_reading" ||
            tmpl.type === "comprehension" ||
            tmpl.type === "matching") &&
          !basePrompt.imageUrl
        ) {
          promptWithImage.imageUrl = coverForLevel(levelCode);
        }
        // flashcard already has local path via template; ensure picsum only as fallback handled in renderer
        if (
          tmpl.type === "flashcard" &&
          typeof basePrompt.imageUrl === "string" &&
          (basePrompt.imageUrl as string).includes("picsum.photos")
        ) {
          // keep as is; renderer will fallback to local placeholder onError
        }
        await prisma.exercise.create({
          data: {
            lessonId: lesson.id,
            type: tmpl.type as never,
            difficulty: tmpl.difficulty,
            prompt: promptWithImage as never,
            solution: tmpl.solution as never,
            aiGenerated: false,
          },
        });
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
  if ((await prisma.exercise.count({ where: { lessonId: examLesson.id } })) === 0) {
    for (let i = 0; i < 5; i++) {
      const tmpl = templates[i % templates.length]!;
      const p = tmpl.prompt as Record<string, unknown>;
      const withImg =
        (tmpl.type === "graded_reading" ||
          tmpl.type === "comprehension" ||
          tmpl.type === "matching") &&
        !p.imageUrl
          ? { ...p, imageUrl: coverForLevel(levelCode) }
          : p;
      await prisma.exercise.create({
        data: {
          lessonId: examLesson.id,
          type: tmpl.type as never,
          difficulty: levelCode.startsWith("C") ? 5 : levelCode.startsWith("B") ? 4 : 3,
          prompt: withImg as never,
          solution: tmpl.solution as never,
        },
      });
    }
  }
  console.log(`  <- done ${levelCode}`);
  // Optional second exam for C levels
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
      for (let i = 0; i < 5; i++) {
        const tmpl = templates[(5 + i) % templates.length]!;
        const p = tmpl.prompt as Record<string, unknown>;
        const withImg =
          (tmpl.type === "graded_reading" ||
            tmpl.type === "comprehension" ||
            tmpl.type === "matching") &&
          !p.imageUrl
            ? { ...p, imageUrl: coverForLevel(levelCode) }
            : p;
        await prisma.exercise.create({
          data: {
            lessonId: examLesson2.id,
            type: tmpl.type as never,
            difficulty: 5,
            prompt: withImg as never,
            solution: tmpl.solution as never,
          },
        });
      }
    }
  }
}

async function main() {
  console.log("Seeding A1..C2 (enriched 6 units x 5 lessons)...");
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
