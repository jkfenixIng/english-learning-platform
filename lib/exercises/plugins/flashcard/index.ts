import { registerExercise } from "../../registry";
import { FlashcardPromptSchema, FlashcardSolutionSchema, FlashcardAnswerSchema } from "./schema";
import { evaluateFlashcard } from "./evaluator";
import { FlashcardRenderer } from "./Renderer";
registerExercise({ type: "flashcard", promptSchema: FlashcardPromptSchema, solutionSchema: FlashcardSolutionSchema, answerSchema: FlashcardAnswerSchema, evaluate: evaluateFlashcard, Renderer: FlashcardRenderer });
export { FlashcardPromptSchema, FlashcardSolutionSchema, FlashcardAnswerSchema, evaluateFlashcard, FlashcardRenderer };
