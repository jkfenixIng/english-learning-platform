import type { SpeakingService } from "./types";

/**
 * WASM Whisper spike — placeholder adapter behind feature flag.
 * Intent: evaluate whisper.cpp / transformers.js offline STT without cloud.
 * Status: spike stub — returns Mock-like behaviour; real inference wired when WASM bundle added.
 * ADR: docs/adr/speaking-wasm.md
 */
export class WasmWhisperAdapter implements SpeakingService {
  isSupported(): boolean {
    // Feature-flagged: enable via NEXT_PUBLIC_ENABLE_WASM_STT=true and WASM bundle
    return typeof window !== "undefined" && (process.env.NEXT_PUBLIC_ENABLE_WASM_STT === "true" || false);
  }
  async startRecording(): Promise<void> {
    // Spike: no-op — real impl would capture MediaStream and feed WASM
    console.info("[WasmWhisperAdapter] spike — startRecording no-op (enable bundle to test)");
  }
  async stopRecording(): Promise<{ transcript: string; confidence: number }> {
    // Spike deterministic transcript for offline testing
    return { transcript: "[wasm spike transcript]", confidence: 0.72 };
  }
  async speak(text: string, opts?: { rate?: number; lang?: string }): Promise<void> {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      if (opts?.rate) u.rate = opts.rate;
      if (opts?.lang) u.lang = opts.lang;
      window.speechSynthesis.speak(u);
    }
  }
  getVoices(): SpeechSynthesisVoice[] {
    return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
  }
}

export const wasmAdapter = new WasmWhisperAdapter();
