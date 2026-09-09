export type LessonKind = "teach" | "practice" | "quiz" | "exam";

export type LessonContentBlock =
  | { type: "heading"; text: string; textEs?: string; level?: 2 | 3 }
  | { type: "paragraph"; text: string; textEs?: string }
  | {
      type: "image";
      url: string;
      alt: string;
      altEs?: string;
      caption?: string;
      captionEs?: string;
    }
  | {
      type: "vocab";
      items: {
        word: string;
        definition: string;
        definitionEs?: string;
        example?: string;
        exampleEs?: string;
      }[];
    }
  | {
      type: "example";
      title?: string;
      titleEs?: string;
      text: string;
      textEs?: string;
      translation?: string;
    }
  | { type: "list"; items: string[]; itemsEs?: string[]; ordered?: boolean }
  | { type: "callout"; text: string; textEs?: string; variant?: "info" | "tip" | "warning" };

export interface LessonContent {
  blocks: LessonContentBlock[];
}

export interface LessonCoverImage {
  url: string;
  alt: string;
}

export interface ExerciseImageAsset {
  url: string;
  alt: string;
  caption?: string;
}

export interface ExerciseAssets {
  images?: ExerciseImageAsset[];
}

/**
 * Resolve effective kind with fallback for old rows where `kind` may be null
 * (e.g. before migration) or where legacy booleans are still the source of truth.
 * Keeps isQuiz/isExam as deprecated compat.
 */
export function resolveLessonKind(row: {
  kind?: LessonKind | string | null;
  isQuiz?: boolean | null;
  isExam?: boolean | null;
}): LessonKind {
  if (
    row.kind === "teach" ||
    row.kind === "practice" ||
    row.kind === "quiz" ||
    row.kind === "exam"
  ) {
    return row.kind;
  }
  if (row.isExam) return "exam";
  if (row.isQuiz) return "quiz";
  return "teach";
}

export function isTeachKind(kind: LessonKind): boolean {
  return kind === "teach" || kind === "practice";
}

export function isEvaluationKind(kind: LessonKind): boolean {
  return kind === "quiz" || kind === "exam";
}

export function lessonKindLabel(kind: LessonKind, locale: string = "en"): string {
  if (locale === "es") {
    switch (kind) {
      case "teach":
        return "Aprender";
      case "practice":
        return "Práctica";
      case "quiz":
        return "Cuestionario";
      case "exam":
        return "Examen";
      default:
        return kind;
    }
  }
  switch (kind) {
    case "teach":
      return "Learn";
    case "practice":
      return "Practice";
    case "quiz":
      return "Quiz";
    case "exam":
      return "Exam";
    default:
      return kind;
  }
}

export function lessonKindBadgeClasses(kind: LessonKind): string {
  switch (kind) {
    case "teach":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
    case "practice":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200";
    case "quiz":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
    case "exam":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
