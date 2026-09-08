"use client";
import { useState } from "react";
import { WebSpeechAdapter } from "../../../speech/web-speech-adapter";
import { speakText } from "../../../speech/tts";
import type { ShadowingPrompt, ShadowingAnswer } from "./schema";
export function ShadowingRenderer({ prompt, onSubmit }: { prompt: ShadowingPrompt; onSubmit: (a: ShadowingAnswer) => void }) {
  const adapter = new WebSpeechAdapter();
  const supported = adapter.isSupported();
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const play = () => speakText(prompt.reference, { rate: prompt.speed ?? 1 });
  const record = async () => { setRecording(true); try { await adapter.startRecording(); const r = await adapter.stopRecording(); setTranscript(r.transcript); } catch {} setRecording(false); };
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Listen, then shadow (repeat immediately):</p>
      <p className="rounded bg-indigo-50 p-3 font-medium">{prompt.reference}</p>
      <div className="flex gap-2">
        <button onClick={play} className="rounded bg-indigo-600 px-4 py-2 text-white">▶ Play</button>
        {supported ? <button onClick={record} disabled={recording} className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50">{recording ? "Listening..." : "● Shadow"}</button> : <span className="text-xs text-amber-600">Type fallback</span>}
      </div>
      {transcript ? <p className="rounded bg-green-50 p-2 text-sm">Heard: {transcript}</p> : null}
      <button onClick={() => onSubmit({ transcript })} className="rounded bg-indigo-600 px-4 py-2 text-white">Submit</button>
    </div>
  );
}
