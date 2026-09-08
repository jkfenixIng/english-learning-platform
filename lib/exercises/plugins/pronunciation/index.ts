import { registerExercise } from "../../registry";
import { PronunciationPromptSchema, PronunciationSolutionSchema, PronunciationAnswerSchema } from "./schema";
import { evaluatePronunciation } from "./evaluator";
import { PronunciationRenderer } from "./Renderer";
registerExercise({ type: "pronunciation", promptSchema: PronunciationPromptSchema, solutionSchema: PronunciationSolutionSchema, answerSchema: PronunciationAnswerSchema, evaluate: evaluatePronunciation, Renderer: PronunciationRenderer });
export { PronunciationPromptSchema, PronunciationSolutionSchema, PronunciationAnswerSchema, evaluatePronunciation, PronunciationRenderer };
