export interface SpeakingService {
  isSupported(): boolean;
  startRecording(opts?: { lang?: string }): Promise<void>;
  stopRecording(): Promise<{ transcript: string; confidence: number }>;
  speak(text: string, opts?: { voice?: string; rate?: number; lang?: string }): Promise<void>;
  getVoices(): SpeechSynthesisVoice[];
}

export interface PronunciationScore {
  overall: number; // 0-100
  wordScores: { word: string; score: number; matched: boolean }[];
  wer: number;
}
