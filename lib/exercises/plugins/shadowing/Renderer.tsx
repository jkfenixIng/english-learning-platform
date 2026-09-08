"use client";
import { useState } from "react";
import { WebSpeechAdapter } from "../../../speech/web-speech-adapter";
import { speakText } from "../../../speech/tts";
import type { ShadowingPrompt, ShadowingAnswer } from "./schema";
import { TranscriptDiff } from "../../../../components/speech/TranscriptDiff";
import { scorePronunciation, getPronunciationFeedback } from "../../../speech/scoring";

const SPEEDS: Record<string, number> = { slow: 0.85, normal: 1, fast: 1.15 };

export function ShadowingRenderer({ prompt, onSubmit }: { prompt: ShadowingPrompt; onSubmit: (a: ShadowingAnswer) => void }) {
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
      <p className="text-sm text-gray-600">Listen, then shadow (repeat immediately with timing):</p>
      <p className="rounded bg-indigo-50 p-3 font-medium dark:bg-indigo-950">{prompt.reference}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={play} className="rounded bg-indigo-600 px-4 py-2 text-white" aria-label="Play reference audio">▶ Play</button>
        <label className="flex items-center gap-1 text-xs" aria-label="Playback speed">
          Speed
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded border px-2 py-1 dark:bg-gray-800">
            <option value={SPEEDS.slow}>Slow 0.85×</option>
            <option value={SPEEDS.normal}>Normal 1×</option>
            <option value={SPEEDS.fast}>Fast 1.15×</option>
          </select>
        </label>
        {supported ? (
          <button onClick={record} disabled={recording} className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50" aria-label={recording ? "Listening" : "Record shadowing"}>
            {recording ? "Listening..." : "● Shadow"}
          </button>
        ) : (
          <span className="text-xs text-amber-600">Type fallback — microphone not supported</span>
        )}
        {transcript ? (
          <button onClick={() => setTranscript("")} className="rounded border px-3 py-2 text-xs" aria-label="Retry shadowing">↺ Retry</button>
        ) : null}
      </div>
      {transcript ? (
        <>
          <p className="rounded bg-green-50 p-2 text-sm dark:bg-green-950">Heard: {transcript}</p>
          <TranscriptDiff reference={prompt.reference} transcript={transcript} />
          {score ? (
            <p className="text-xs text-gray-500" aria-live="polite">Score {score.overall}/100 · WER {(score.wer * 100).toFixed(0)}%</p>
          ) : null}
          {feedback ? <p className="rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">{feedback}</p> : null}
        </>
      ) : null}
      <button onClick={() => onSubmit({ transcript })} className="rounded bg-indigo-600 px-4 py-2 text-white" aria-label="Submit shadowing">Submit</button>
    </div>
  );
}
