"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { WebSpeechAdapter } from "../../../speech/web-speech-adapter";
import { speakText } from "../../../speech/tts";
import type { SpeakingRecordPrompt, SpeakingRecordAnswer } from "./schema";
export function SpeakingRecordRenderer({
  prompt,
  onSubmit,
}: {
  prompt: SpeakingRecordPrompt;
  onSubmit: (a: SpeakingRecordAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const adapter = new WebSpeechAdapter();
  const supported = adapter.isSupported();
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const start = async () => {
    setRecording(true);
    try {
      await adapter.startRecording();
      const res = await adapter.stopRecording();
      setTranscript(res.transcript);
    } catch {
      /* ignore */
    }
    setRecording(false);
  };
  return (
    <div className="space-y-3">
      <p className="font-medium">{prompt.instruction ?? t("say")}</p>
      <p className="rounded bg-indigo-50 p-3 text-indigo-900">{prompt.text}</p>
      <div className="flex gap-2">
        <button onClick={() => speakText(prompt.text)} className="rounded border px-3 py-2 text-sm">
          {t("playReference")}
        </button>
        {supported ? (
          <button
            onClick={start}
            disabled={recording}
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {recording ? t("listening") : t("record")}
          </button>
        ) : (
          <span className="text-xs text-amber-600">{t("notSupportedType")}</span>
        )}
      </div>
      {transcript ? (
        <p className="rounded bg-green-50 p-2 text-sm">{t("heard", { transcript })}</p>
      ) : null}
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={supported ? t("orTypeFallback") : t("typeResponse")}
        className="w-full rounded border px-3 py-2 text-sm"
      />
      <button
        onClick={() => onSubmit({ transcript: transcript || typed, fallbackTyped: typed })}
        className="bg-primary rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
