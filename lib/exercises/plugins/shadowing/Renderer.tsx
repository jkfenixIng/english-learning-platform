"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { WebSpeechAdapter } from "../../../speech/web-speech-adapter";
import { speakText } from "../../../speech/tts";
import type { ShadowingPrompt, ShadowingAnswer } from "./schema";
import { TranscriptDiff } from "../../../../components/speech/TranscriptDiff";
import { scorePronunciation, getPronunciationFeedback } from "../../../speech/scoring";

const SPEEDS: Record<string, number> = { slow: 0.85, normal: 1, fast: 1.15 };

export function ShadowingRenderer({
  prompt,
  onSubmit,
}: {
  prompt: ShadowingPrompt;
  onSubmit: (a: ShadowingAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const adapter = new WebSpeechAdapter();
  const supported = adapter.isSupported();
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [speed, setSpeed] = useState<number>(prompt.speed ?? 1);
  const play = () => speakText(prompt.reference, { rate: speed });
  const record = async () => {
    setRecording(true);
    try {
      await adapter.startRecording();
      const r = await adapter.stopRecording();
      setTranscript(r.transcript);
    } catch {
      // mic denied fallback
    }
    setRecording(false);
  };
  const score = transcript ? scorePronunciation(prompt.reference, transcript) : null;
  const feedback = transcript ? getPronunciationFeedback(prompt.reference, transcript) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t("listenShadow")}</p>
      <p className="rounded border border-indigo-100 bg-indigo-50 p-3 font-medium text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
        {prompt.reference}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={play}
          className="bg-primary rounded px-4 py-2 text-white"
          aria-label={t("play")}
        >
          {t("play")}
        </button>
        <label className="flex items-center gap-1 text-xs" aria-label={t("speed")}>
          {t("speed")}
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value={SPEEDS.slow}>{t("slow")}</option>
            <option value={SPEEDS.normal}>{t("normal")}</option>
            <option value={SPEEDS.fast}>{t("fast")}</option>
          </select>
        </label>
        {supported ? (
          <button
            onClick={record}
            disabled={recording}
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            aria-label={recording ? t("listening") : t("shadow")}
          >
            {recording ? t("listening") : t("shadow")}
          </button>
        ) : (
          <span className="text-xs text-amber-600">{t("typeFallbackMic")}</span>
        )}
        {transcript ? (
          <button
            onClick={() => setTranscript("")}
            className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label={t("retryAction")}
          >
            {t("retryAction")}
          </button>
        ) : null}
      </div>
      {transcript ? (
        <>
          <p className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            {t("heard", { transcript })}
          </p>
          <TranscriptDiff reference={prompt.reference} transcript={transcript} />
          {score ? (
            <p className="text-xs text-gray-500" aria-live="polite">
              {t("scoreWer", { score: score.overall, wer: (score.wer * 100).toFixed(0) })}
            </p>
          ) : null}
          {feedback ? (
            <p className="rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {feedback}
            </p>
          ) : null}
        </>
      ) : null}
      <button
          data-exercise-submit
        onClick={() => onSubmit({ transcript })}
        className="bg-primary rounded px-4 py-2 text-white"
        aria-label={t("submit")}
      >
        {t("submit")}
      </button>
    </div>
  );
}
