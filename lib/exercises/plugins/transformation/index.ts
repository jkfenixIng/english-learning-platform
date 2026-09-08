import { registerExercise } from "../../registry";
import { TransformationPromptSchema, TransformationSolutionSchema, TransformationAnswerSchema } from "./schema";
import { evaluateTransformation } from "./evaluator";
import { TransformationRenderer } from "./Renderer";
registerExercise({ type: "transformation", promptSchema: TransformationPromptSchema, solutionSchema: TransformationSolutionSchema, answerSchema: TransformationAnswerSchema, evaluate: evaluateTransformation, Renderer: TransformationRenderer });
export { TransformationPromptSchema, TransformationSolutionSchema, TransformationAnswerSchema, evaluateTransformation, TransformationRenderer };
