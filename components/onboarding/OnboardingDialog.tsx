"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "onboardingSeen";

export function OnboardingDialog() {
  const t = useTranslations("onboarding");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // localStorage unavailable (SSR/priv mode) — don't block
    }
  }, []);

  if (!open) return null;

  const steps = [
    { title: t("step1Title"), desc: t("step1Desc"), icon: "🗺️" },
    { title: t("step2Title"), desc: t("step2Desc"), icon: "🧠" },
    { title: t("step3Title"), desc: t("step3Desc"), icon: "🏆" },
  ];
  const current = steps[step]!;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  }

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="bg-card w-full max-w-md rounded-xl border p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">
            {t("stepLabel", { current: step + 1, total: steps.length })}
          </span>
          <button
            onClick={dismiss}
            aria-label={t("close")}
            className="text-muted-foreground hover:bg-muted rounded p-1"
          >
            ✕
          </button>
        </div>
        <div className="py-2 text-center">
          <div className="text-4xl" aria-hidden>
            {current.icon}
          </div>
          <h2 id="onboarding-title" className="text-foreground mt-3 text-lg font-semibold">
            {current.title}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{current.desc}</p>
        </div>
        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={step === 0}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-40"
          >
            {t("back")}
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={"h-1.5 w-6 rounded-full " + (i === step ? "bg-primary" : "bg-border")}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="bg-primary text-primary-foreground hover:bg-primary-600 rounded-md px-4 py-2 text-sm font-medium"
          >
            {step === steps.length - 1 ? t("done") : t("next")}
          </button>
        </div>
        <button
          onClick={dismiss}
          className="text-muted-foreground mx-auto mt-4 block text-xs underline"
        >
          {t("skip")}
        </button>
      </div>
    </div>
  );
}
