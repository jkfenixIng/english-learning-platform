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
          className="focus-visible:ring-primary-500 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus-visible:ring-2 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value={0.75}>0.75x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
        </select>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t("listenAnswer")}</p>
      <p className="font-medium text-slate-900 dark:text-slate-100">{prompt.question}</p>
      {prompt.options ? (
        <div className="space-y-2">
          {prompt.options.map((o) => (
            <label
              key={o}
              className="flex items-center gap-2 rounded border border-slate-200 bg-white p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
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
          className="focus-visible:ring-primary-500 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      )}
      <button
          data-exercise-submit
        onClick={() => onSubmit({ answer })}
        className="bg-primary rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
