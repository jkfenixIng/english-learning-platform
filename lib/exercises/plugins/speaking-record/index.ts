import { registerExercise } from "../../registry";
import { SpeakingRecordPromptSchema, SpeakingRecordSolutionSchema, SpeakingRecordAnswerSchema } from "./schema";
import { evaluateSpeakingRecord } from "./evaluator";
import { SpeakingRecordRenderer } from "./Renderer";
registerExercise({ type: "speaking_record", promptSchema: SpeakingRecordPromptSchema, solutionSchema: SpeakingRecordSolutionSchema, answerSchema: SpeakingRecordAnswerSchema, evaluate: evaluateSpeakingRecord, Renderer: SpeakingRecordRenderer });
export { SpeakingRecordPromptSchema, SpeakingRecordSolutionSchema, SpeakingRecordAnswerSchema, evaluateSpeakingRecord, SpeakingRecordRenderer };
