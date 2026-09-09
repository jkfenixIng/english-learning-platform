"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { speakText, stopSpeaking } from "../../../speech/tts";
import type { ListeningTtsPrompt, ListeningTtsAnswer } from "./schema";
export function ListeningTtsRenderer({
  prompt,
  onSubmit,
}: {
  prompt: ListeningTtsPrompt;
  onSubmit: (a: ListeningTtsAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [rate, setRate] = useState(1);
  const [answer, setAnswer] = useState("");
  const play = () => speakText(prompt.text, { rate });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={play} className="bg-primary rounded px-4 py-2 text-white">
          {t("play")}
        </button>
        <button onClick={stopSpeaking} className="rounded border px-3 py-2 text-sm">
          {t("stop")}
        </button>
        <select
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value={0.75}>0.75x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
        </select>
      </div>
      <p className="text-sm text-gray-500">{t("listenAnswer")}</p>
      <p className="font-medium">{prompt.question}</p>
      {prompt.options ? (
        <div className="space-y-2">
          {prompt.options.map((o) => (
            <label key={o} className="flex items-center gap-2 rounded border p-2">
              <input
                type="radio"
                name="ans"
                value={o}
                checked={answer === o}
                onChange={() => setAnswer(o)}
              />
              {o}
            </label>
          ))}
        </div>
      ) : (
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t("yourAnswer")}
          className="w-full rounded border px-3 py-2"
        />
      )}
      <button
        onClick={() => onSubmit({ answer })}
        className="bg-primary rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
