import { registerExercise } from "../../registry";
import { GradedReadingPromptSchema, GradedReadingSolutionSchema, GradedReadingAnswerSchema } from "./schema";
import { evaluateGradedReading } from "./evaluator";
import { GradedReadingRenderer } from "./Renderer";
registerExercise({ type: "graded_reading", promptSchema: GradedReadingPromptSchema, solutionSchema: GradedReadingSolutionSchema, answerSchema: GradedReadingAnswerSchema, evaluate: evaluateGradedReading, Renderer: GradedReadingRenderer });
export { GradedReadingPromptSchema, GradedReadingSolutionSchema, GradedReadingAnswerSchema, evaluateGradedReading, GradedReadingRenderer };
