export interface ChatMessage { role: "user" | "assistant" | "system"; content: string; }

export interface TutorProvider {
  chat(messages: ChatMessage[], opts?: { level?: string; locale?: string }): Promise<string>;
  correctWriting(prompt: string, userText: string, opts?: { level?: string }): Promise<{ score: number; feedback: string; corrections: string[] }>;
  generateExercise(spec: { type: string; level: string; topic: string }): Promise<{ prompt: unknown; solution: unknown }>;
  isAvailable(): Promise<boolean>;
}
