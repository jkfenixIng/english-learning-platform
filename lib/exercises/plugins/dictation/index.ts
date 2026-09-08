import { registerExercise } from "../../registry";
import { DictationPromptSchema, DictationSolutionSchema, DictationAnswerSchema } from "./schema";
import { evaluateDictation } from "./evaluator";
import { DictationRenderer } from "./Renderer";
registerExercise({ type: "dictation", promptSchema: DictationPromptSchema, solutionSchema: DictationSolutionSchema, answerSchema: DictationAnswerSchema, evaluate: evaluateDictation, Renderer: DictationRenderer });
export { DictationPromptSchema, DictationSolutionSchema, DictationAnswerSchema, evaluateDictation, DictationRenderer };
