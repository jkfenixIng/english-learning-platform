"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { WebSpeechAdapter } from "../../../speech/web-speech-adapter";
import { speakText } from "../../../speech/tts";
import type { PronunciationPrompt, PronunciationAnswer } from "./schema";
export function PronunciationRenderer({
  prompt,
  onSubmit,
}: {
  prompt: PronunciationPrompt;
  onSubmit: (a: PronunciationAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const adapter = new WebSpeechAdapter();
  const supported = adapter.isSupported();
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const record = async () => {
    setRecording(true);
    try {
      await adapter.startRecording();
      const r = await adapter.stopRecording();
      setTranscript(r.transcript);
    } catch {}
    setRecording(false);
  };
  return (
    <div className="space-y-3">
      <p className="text-center text-2xl font-bold">{prompt.word}</p>
      {prompt.phonetic ? (
        <p className="text-center text-sm text-gray-500">{prompt.phonetic}</p>
      ) : null}
      {prompt.example ? (
        <p className="text-center text-sm text-gray-600 italic">{prompt.example}</p>
      ) : null}
      <div className="flex justify-center gap-2">
        <button onClick={() => speakText(prompt.word)} className="rounded border px-4 py-2 text-sm">
          {t("hear")}
        </button>
        {supported ? (
          <button
            onClick={record}
            disabled={recording}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {recording ? t("listening") : t("pronounce")}
          </button>
        ) : (
          <span className="text-xs text-amber-600">{t("browserUnsupported")}</span>
        )}
      </div>
      {transcript ? (
        <p className="rounded bg-green-50 p-2 text-center text-sm">{t("heard", { transcript })}</p>
      ) : null}
      <button
        onClick={() => onSubmit({ transcript })}
        className="bg-primary w-full rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
