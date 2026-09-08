import type { TutorProvider, ChatMessage } from "./provider";
import { MockProvider } from "./providers/mock";
import { OpenRouterProvider } from "./providers/openrouter";
import { GroqProvider } from "./providers/groq";
import { getCache, setCache, hashKey } from "./cache";
import { checkRateLimit } from "./rate-limit";
import { decryptApiKey } from "./encryption";

type RouterOpts = {
  provider?: string;
  apiKey?: string;
  model?: string | undefined;
  userId?: string | null;
};

export class ProviderRouter implements TutorProvider {
  private primary: TutorProvider;
  private fallbacks: TutorProvider[];
  private userId: string | null = null;

  constructor(opts?: RouterOpts, primary?: TutorProvider, fallbacks: TutorProvider[] = []) {
    // explicit primary/fallbacks wins (for tests)
    if (primary) {
      this.primary = primary;
      this.fallbacks = fallbacks;
      this.userId = opts?.userId ?? null;
      return;
    }

    const provider = (opts?.provider ?? process.env.AI_PROVIDER ?? "mock").toLowerCase();
    const apiKey = opts?.apiKey;
    const model = opts?.model ?? process.env.AI_MODEL ?? "meta-llama/llama-3.1-8b:free";
    this.userId = opts?.userId ?? null;

    if (provider === "openrouter") {
      const key = apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
      this.primary = new OpenRouterProvider(key, model);
      this.fallbacks = process.env.GROQ_API_KEY
        ? [new GroqProvider(process.env.GROQ_API_KEY)]
        : [new MockProvider()];
      // If per-user key missing but global fallback exists, allow global groq as additional fallback already
      if (!key && process.env.GROQ_API_KEY) {
        // primary will be mock-like fallback? but we keep openrouter with empty key → isAvailable false → will try fallbacks
      }
    } else if (provider === "groq") {
      const key = apiKey ?? process.env.GROQ_API_KEY ?? "";
      const groqModel =
        model && model !== "meta-llama/llama-3.1-8b:free" ? model : "llama-3.1-8b-instant";
      this.primary = new GroqProvider(key, groqModel);
      this.fallbacks = [new MockProvider()];
    } else {
      this.primary = new MockProvider();
      this.fallbacks = [];
    }
  }

  static async createForUser(userId: string | null): Promise<ProviderRouter> {
    if (!userId) return new ProviderRouter({ userId: null });
    try {
      const { prisma } = await import("../db");
      const settings = await prisma.userAiSettings.findUnique({ where: { userId } });
      if (!settings || !settings.enabled) {
        return new ProviderRouter({ userId });
      }
      const provider = (settings.provider ?? "mock").toLowerCase();
      if (provider === "mock") {
        return new ProviderRouter({ provider: "mock", userId });
      }
      const decrypted = settings.encryptedApiKey ? decryptApiKey(settings.encryptedApiKey) : "";
      if (!decrypted) {
        return new ProviderRouter({ provider, userId });
      }
      return new ProviderRouter({
        provider,
        apiKey: decrypted,
        model: settings.model ?? undefined,
        userId,
      });
    } catch (e) {
      console.warn("[ProviderRouter] createForUser failed, falling back to env", e);
      return new ProviderRouter({ userId: null });
    }
  }

  async chat(messages: ChatMessage[], opts?: { level?: string; locale?: string }): Promise<string> {
    // namespace cache by userId to avoid cross-user leakage
    const ns = this.userId ? `u:${this.userId}:` : "";
    const key = hashKey(ns + JSON.stringify(messages) + (opts?.level ?? "") + (opts?.locale ?? ""));
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
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("No provider available");
  }

  async correctWriting(
    prompt: string,
    userText: string,
    opts?: { level?: string },
  ): Promise<{ score: number; feedback: string; corrections: string[] }> {
    const base = opts?.level ?? "anonymous";
    const uid = this.userId ? `${this.userId}:${base}` : base;
    const rl = checkRateLimit(`correct:${uid}`);
    if (!rl.allowed)
      return {
        score: 0,
        feedback: "Daily AI correction limit reached (20/day). Try again tomorrow.",
        corrections: [],
      };
    for (const p of [this.primary, ...this.fallbacks]) {
      try {
        if (await p.isAvailable()) return await p.correctWriting(prompt, userText, opts);
      } catch {
        /* try next */
      }
    }
    return { score: 60, feedback: "AI unavailable — heuristic score applied.", corrections: [] };
  }

  async generateExercise(spec: {
    type: string;
    level: string;
    topic: string;
  }): Promise<{ prompt: unknown; solution: unknown }> {
    for (const p of [this.primary, ...this.fallbacks]) {
      try {
        if (await p.isAvailable()) return await p.generateExercise(spec);
      } catch {
        /* next */
      }
    }
    throw new Error("No provider available for generation");
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await this.primary.isAvailable();
    } catch {
      return false;
    }
  }
}

export const tutorRouter = new ProviderRouter();
