import type { TutorProvider, ChatMessage } from "../provider";
export class GroqProvider implements TutorProvider {
  constructor(private apiKey: string, private model = "llama-3.1-8b-instant") {}
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) throw new Error("GROQ_API_KEY missing");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message.content ?? "";
  }
  async correctWriting(prompt: string, userText: string): Promise<{ score: number; feedback: string; corrections: string[] }> {
    const r = await this.chat([{ role: "user", content: `Correct writing prompt "${prompt}": ${userText}. JSON {score, feedback, corrections}` }]);
    try { return JSON.parse(r); } catch { return { score: 70, feedback: r, corrections: [] }; }
  }
  async generateExercise(spec: { type: string; level: string; topic: string }): Promise<{ prompt: unknown; solution: unknown }> {
    const r = await this.chat([{ role: "user", content: `Generate ${spec.type} for ${spec.level} ${spec.topic} JSON {prompt,solution}` }]);
    try { const j = JSON.parse(r); return { prompt: j.prompt, solution: j.solution }; } catch { return { prompt: { text: r }, solution: {} }; }
  }
  async isAvailable(): Promise<boolean> { return Boolean(this.apiKey); }
}
