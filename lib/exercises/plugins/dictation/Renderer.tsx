"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { speakText } from "../../../speech/tts";
import type { DictationPrompt, DictationAnswer } from "./schema";
export function DictationRenderer({
  prompt,
  onSubmit,
}: {
  prompt: DictationPrompt;
  onSubmit: (a: DictationAnswer) => void;
}) {
  const t = useTranslations("exercise");
  const [text, setText] = useState("");
  const [plays, setPlays] = useState(0);
  const play = () => {
    speakText(prompt.text);
    setPlays((c) => c + 1);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">{t("listenTranscribe")}</p>
      <button onClick={play} className="bg-primary rounded px-4 py-2 text-white">
        {t("playCount", { plays, allowed: prompt.playsAllowed })}
      </button>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("typeHeard")}
        rows={3}
        className="w-full rounded border px-3 py-2"
      />
      <button
        onClick={() => onSubmit({ text })}
        className="bg-primary rounded px-4 py-2 text-white"
      >
        {t("submit")}
      </button>
    </div>
  );
}
