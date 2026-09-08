"use client";
import type { SpeakingService } from "./types";

declare global {
  interface Window {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  }
}

export class WebSpeechAdapter implements SpeakingService {
  private recognition: unknown = null;
  private lastTranscript = "";
  private lastConfidence = 0;

  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  async startRecording(opts?: { lang?: string }): Promise<void> {
    if (!this.isSupported()) throw new Error("SpeechRecognition not supported");
    const Ctor = (window.SpeechRecognition ?? window.webkitSpeechRecognition) as unknown as new () => { lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((e: { results: { 0: { transcript: string; confidence: number } }[] }) => void) | null; onerror: ((e: unknown) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
    const rec = new Ctor();
    rec.lang = opts?.lang ?? "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    this.recognition = rec;
    this.lastTranscript = "";
    return new Promise((resolve, reject) => {
      if (!rec) return reject(new Error("No recognition"));
      rec.onresult = (e: { results: { 0: { transcript: string; confidence: number } }[] }) => {
        const res = e.results[0]?.[0];
        if (res) { this.lastTranscript = res.transcript; this.lastConfidence = res.confidence; }
      };
      rec.onerror = (e: unknown) => reject(e);
      rec.onend = () => resolve();
      rec.start();
    });
  }

  async stopRecording(): Promise<{ transcript: string; confidence: number }> {
    (this.recognition as { stop: () => void } | null)?.stop();
    await new Promise((r) => setTimeout(r, 300));
    return { transcript: this.lastTranscript, confidence: this.lastConfidence };
  }

  async speak(text: string, opts?: { voice?: string; rate?: number; lang?: string }): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = opts?.rate ?? 1;
    utter.lang = opts?.lang ?? "en-US";
    return new Promise((resolve) => {
      utter.onend = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    return window.speechSynthesis.getVoices();
  }
}
