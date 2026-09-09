"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/Input";
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
      <p className="text-sm text-slate-600 dark:text-slate-400">{t("listenTranscribe")}</p>
      <button onClick={play} className="bg-primary rounded px-4 py-2 text-white">
        {t("playCount", { plays, allowed: prompt.playsAllowed })}
      </button>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("typeHeard")}
        rows={3}
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
