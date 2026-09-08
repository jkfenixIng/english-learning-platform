import { registerExercise } from "../../registry";
import { ComprehensionPromptSchema, ComprehensionSolutionSchema, ComprehensionAnswerSchema } from "./schema";
import { evaluateComprehension } from "./evaluator";
import { ComprehensionRenderer } from "./Renderer";
registerExercise({ type: "comprehension", promptSchema: ComprehensionPromptSchema, solutionSchema: ComprehensionSolutionSchema, answerSchema: ComprehensionAnswerSchema, evaluate: evaluateComprehension, Renderer: ComprehensionRenderer });
export { ComprehensionPromptSchema, ComprehensionSolutionSchema, ComprehensionAnswerSchema, evaluateComprehension, ComprehensionRenderer };
