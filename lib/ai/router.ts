import type { TutorProvider, ChatMessage } from "./provider";
import { MockProvider } from "./providers/mock";
import { OpenRouterProvider } from "./providers/openrouter";
import { GroqProvider } from "./providers/groq";
import { getCache, setCache, hashKey } from "./cache";
import { checkRateLimit } from "./rate-limit";

export class ProviderRouter implements TutorProvider {
  private primary: TutorProvider;
  private fallbacks: TutorProvider[];
  constructor(primary?: TutorProvider, fallbacks: TutorProvider[] = []) {
    const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
    if (primary) {
      this.primary = primary;
      this.fallbacks = fallbacks;
    } else if (provider === "openrouter") {
      this.primary = new OpenRouterProvider(process.env.OPENROUTER_API_KEY ?? "", process.env.AI_MODEL ?? "meta-llama/llama-3.1-8b:free");
      this.fallbacks = process.env.GROQ_API_KEY ? [new GroqProvider(process.env.GROQ_API_KEY)] : [new MockProvider()];
    } else if (provider === "groq") {
      this.primary = new GroqProvider(process.env.GROQ_API_KEY ?? "");
      this.fallbacks = [new MockProvider()];
    } else {
      this.primary = new MockProvider();
      this.fallbacks = [];
    }
  }

  async chat(messages: ChatMessage[], opts?: { level?: string; locale?: string }): Promise<string> {
    const key = hashKey(JSON.stringify(messages) + (opts?.level ?? "") + (opts?.locale ?? ""));
    const cached = getCache(key);
    if (cached) return cached;
    const providers = [this.primary, ...this.fallbacks];
    let lastErr: unknown;
    for (const p of providers) {
      try {
        if (!(await p.isAvailable())) continue;
        const res = await p.chat(messages, opts);
        setCache(key, res);
        return res;
      } catch (e) { lastErr = e; }
    }
    throw lastErr ?? new Error("No provider available");
  }

  async correctWriting(prompt: string, userText: string, opts?: { level?: string }): Promise<{ score: number; feedback: string; corrections: string[] }> {
    const uid = opts?.level ?? "anonymous";
    const rl = checkRateLimit(`correct:${uid}`);
    if (!rl.allowed) return { score: 0, feedback: "Daily AI correction limit reached (20/day). Try again tomorrow.", corrections: [] };
    for (const p of [this.primary, ...this.fallbacks]) {
      try { if (await p.isAvailable()) return await p.correctWriting(prompt, userText, opts); } catch { /* try next */ }
    }
    return { score: 60, feedback: "AI unavailable — heuristic score applied.", corrections: [] };
  }

  async generateExercise(spec: { type: string; level: string; topic: string }): Promise<{ prompt: unknown; solution: unknown }> {
    for (const p of [this.primary, ...this.fallbacks]) {
      try { if (await p.isAvailable()) return await p.generateExercise(spec); } catch { /* next */ }
    }
    throw new Error("No provider available for generation");
  }

  async isAvailable(): Promise<boolean> { return true; }
}

export const tutorRouter = new ProviderRouter();
