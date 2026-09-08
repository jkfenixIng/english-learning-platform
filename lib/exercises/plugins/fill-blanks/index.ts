import { registerExercise } from "../../registry";
import { FillBlanksPromptSchema, FillBlanksSolutionSchema, FillBlanksAnswerSchema } from "./schema";
import { evaluateFillBlanks } from "./evaluator";
import { FillBlanksRenderer } from "./Renderer";

registerExercise({
  type: "fill_blanks",
  promptSchema: FillBlanksPromptSchema,
  solutionSchema: FillBlanksSolutionSchema,
  answerSchema: FillBlanksAnswerSchema,
  evaluate: evaluateFillBlanks,
  Renderer: FillBlanksRenderer,
});
export { FillBlanksPromptSchema, FillBlanksSolutionSchema, FillBlanksAnswerSchema, evaluateFillBlanks, FillBlanksRenderer };
