import { registerExercise } from "../../registry";
import { ShadowingPromptSchema, ShadowingSolutionSchema, ShadowingAnswerSchema } from "./schema";
import { evaluateShadowing } from "./evaluator";
import { ShadowingRenderer } from "./Renderer";
registerExercise({ type: "shadowing", promptSchema: ShadowingPromptSchema, solutionSchema: ShadowingSolutionSchema, answerSchema: ShadowingAnswerSchema, evaluate: evaluateShadowing, Renderer: ShadowingRenderer });
export { ShadowingPromptSchema, ShadowingSolutionSchema, ShadowingAnswerSchema, evaluateShadowing, ShadowingRenderer };
