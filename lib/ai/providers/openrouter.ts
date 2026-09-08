import type { TutorProvider, ChatMessage } from "../provider";

export class OpenRouterProvider implements TutorProvider {
  constructor(private apiKey: string, private model: string) {}
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) throw new Error("OPENROUTER_API_KEY missing");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" },
      body: JSON.stringify({ model: this.model, messages }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message.content ?? "";
  }
  async correctWriting(prompt: string, userText: string): Promise<{ score: number; feedback: string; corrections: string[] }> {
    const reply = await this.chat([{ role: "user", content: `Correct this writing. Prompt: ${prompt}\nText: ${userText}\nReturn JSON: {score, feedback, corrections: string[]}` }]);
    try { return JSON.parse(reply); } catch { return { score: 70, feedback: reply, corrections: [] }; }
  }
  async generateExercise(spec: { type: string; level: string; topic: string }): Promise<{ prompt: unknown; solution: unknown }> {
    const reply = await this.chat([{ role: "user", content: `Generate a ${spec.type} exercise for ${spec.level} about ${spec.topic}. Return JSON {prompt, solution}` }]);
    try { const j = JSON.parse(reply); return { prompt: j.prompt, solution: j.solution }; } catch { return { prompt: { text: reply }, solution: {} }; }
  }
  async isAvailable(): Promise<boolean> { return Boolean(this.apiKey); }
}
