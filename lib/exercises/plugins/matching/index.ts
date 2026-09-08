import { registerExercise } from "../../registry";
import { MatchingPromptSchema, MatchingSolutionSchema, MatchingAnswerSchema } from "./schema";
import { evaluateMatching } from "./evaluator";
import { MatchingRenderer } from "./Renderer";
registerExercise({ type: "matching", promptSchema: MatchingPromptSchema, solutionSchema: MatchingSolutionSchema, answerSchema: MatchingAnswerSchema, evaluate: evaluateMatching, Renderer: MatchingRenderer });
export { MatchingPromptSchema, MatchingSolutionSchema, MatchingAnswerSchema, evaluateMatching, MatchingRenderer };
