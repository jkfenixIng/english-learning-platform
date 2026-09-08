"use client";
export function speakText(text: string, opts?: { rate?: number; voice?: string; lang?: string }): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = opts?.rate ?? 1;
  utter.lang = opts?.lang ?? "en-US";
  if (opts?.voice) {
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((voice) => voice.name === opts.voice);
    if (v) utter.voice = v;
  }
  window.speechSynthesis.speak(utter);
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
