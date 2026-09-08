import { registerExercise } from "../../registry";
import { WritingPromptSchema, WritingSolutionSchema, WritingAnswerSchema } from "./schema";
import { evaluateWritingPrompt } from "./evaluator";
import { WritingPromptRenderer } from "./Renderer";
registerExercise({ type: "writing_prompt", promptSchema: WritingPromptSchema, solutionSchema: WritingSolutionSchema, answerSchema: WritingAnswerSchema, evaluate: evaluateWritingPrompt, Renderer: WritingPromptRenderer });
export { WritingPromptSchema, WritingSolutionSchema, WritingAnswerSchema, evaluateWritingPrompt, WritingPromptRenderer };
