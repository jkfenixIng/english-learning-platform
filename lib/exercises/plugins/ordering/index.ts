import { registerExercise } from "../../registry";
import { OrderingPromptSchema, OrderingSolutionSchema, OrderingAnswerSchema } from "./schema";
import { evaluateOrdering } from "./evaluator";
import { OrderingRenderer } from "./Renderer";
registerExercise({ type: "ordering", promptSchema: OrderingPromptSchema, solutionSchema: OrderingSolutionSchema, answerSchema: OrderingAnswerSchema, evaluate: evaluateOrdering, Renderer: OrderingRenderer });
export { OrderingPromptSchema, OrderingSolutionSchema, OrderingAnswerSchema, evaluateOrdering, OrderingRenderer };
