import type { TutorProvider, ChatMessage } from "../provider";

export class MockProvider implements TutorProvider {
  async chat(messages: ChatMessage[]): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    return `[Mock tutor reply to: "${last.slice(0, 60)}"] — This is a mock response. Configure OPENROUTER_API_KEY to enable real AI.`;
  }
  async correctWriting(_prompt: string, userText: string): Promise<{ score: number; feedback: string; corrections: string[] }> {
    const words = userText.trim().split(/\s+/).filter(Boolean).length;
    return { score: words > 10 ? 75 : 50, feedback: "Mock correction: good effort! Add more varied vocabulary.", corrections: [] };
  }
  async generateExercise(spec: { type: string; level: string; topic: string }): Promise<{ prompt: unknown; solution: unknown }> {
    return { prompt: { text: `Mock ${spec.type} for ${spec.level} about ${spec.topic}` }, solution: { answer: "mock" } };
  }
  async isAvailable(): Promise<boolean> { return true; }
}
