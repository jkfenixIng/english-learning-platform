import type { SpeakingService } from "./types";

export class MockAdapter implements SpeakingService {
  private transcript = "hello world";
  isSupported(): boolean { return true; }
  async startRecording(): Promise<void> {}
  async stopRecording(): Promise<{ transcript: string; confidence: number }> {
    return { transcript: this.transcript, confidence: 0.9 };
  }
  async speak(): Promise<void> {}
  getVoices(): SpeechSynthesisVoice[] { return []; }
  setMockTranscript(t: string) { this.transcript = t; }
}
