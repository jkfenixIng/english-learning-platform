import { registerExercise } from "../../registry";
import { ListeningTtsPromptSchema, ListeningTtsSolutionSchema, ListeningTtsAnswerSchema } from "./schema";
import { evaluateListeningTts } from "./evaluator";
import { ListeningTtsRenderer } from "./Renderer";
registerExercise({ type: "listening_tts", promptSchema: ListeningTtsPromptSchema, solutionSchema: ListeningTtsSolutionSchema, answerSchema: ListeningTtsAnswerSchema, evaluate: evaluateListeningTts, Renderer: ListeningTtsRenderer });
export { ListeningTtsPromptSchema, ListeningTtsSolutionSchema, ListeningTtsAnswerSchema, evaluateListeningTts, ListeningTtsRenderer };
