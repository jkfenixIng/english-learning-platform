"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

const TYPES = [
  "fill_blanks",
  "ordering",
  "transformation",
  "flashcard",
  "matching",
  "listening_tts",
  "dictation",
  "comprehension",
  "graded_reading",
  "writing_prompt",
  "speaking_record",
  "shadowing",
  "pronunciation",
] as const;

type ImageAsset = { url: string; alt: string; caption?: string };

type Props = {
  lessonId?: string;
  exerciseId?: string | null;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
};

const STEPS = [
  { id: 1, title: "Tipo y lección", desc: "Elige tipo y dificultad", icon: "🎯" },
  { id: 2, title: "Contenido", desc: "Formulario por tipo", icon: "✍️" },
  { id: 3, title: "Preview y guardar", desc: "Revisa y publica", icon: "👁️" },
] as const;

function FieldHelp({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <span
        title={tip}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-100"
        aria-label={tip}
      >
        ?
      </span>
    </span>
  );
}

function ExerciseRealPreview({
  type,
  payload,
}: {
  type: string;
  payload: { prompt: unknown; solution: unknown } | null;
}) {
  if (!payload)
    return <p className="text-xs text-slate-500">Completa el paso 2 para ver preview.</p>;
  const p = payload.prompt as Record<string, unknown>;
  const s = payload.solution as Record<string, unknown>;
  switch (type) {
    case "fill_blanks": {
      const text = (p.text as string) ?? "";
      const parts = text.split("___");
      return (
        <div className="space-y-2">
          <p className="text-sm">
            {parts.map((part, i) => (
              <span key={i}>
                {part}
                {i < parts.length - 1 ? (
                  <span className="mx-1 rounded border bg-amber-50 px-2 py-0.5 text-xs dark:bg-amber-950/30">
                    ____
                  </span>
                ) : null}
              </span>
            ))}
          </p>
          <p className="text-[11px] text-slate-500">Respuestas: {JSON.stringify(s.answers)}</p>
        </div>
      );
    }
    case "ordering": {
      const tokens = (p.tokens as string[]) ?? [];
      return (
        <div className="flex flex-wrap gap-2">
          {tokens.map((t, i) => (
            <span
              key={i}
              className="rounded-full border bg-white px-3 py-1 text-xs dark:bg-slate-800"
            >
              {t}
            </span>
          ))}
        </div>
      );
    }
    case "flashcard": {
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4 text-center dark:bg-slate-800">
            <p className="text-sm font-bold">{String(p.front)}</p>
            <p className="text-xs text-slate-500">Front</p>
          </div>
          <div className="rounded-xl border bg-indigo-50 p-4 text-center dark:bg-indigo-950/30">
            <p className="text-sm">{String(p.back)}</p>
            <p className="text-xs text-slate-500">Back</p>
          </div>
        </div>
      );
    }
    case "matching": {
      const pairs = (p.pairs as { left: string; right: string }[]) ?? [];
      return (
        <div className="grid gap-1 text-xs">
          {pairs.map((pr, i) => (
            <div
              key={i}
              className="flex justify-between rounded border bg-white px-2 py-1 dark:bg-slate-800"
            >
              <span>{pr.left}</span>
              <span>↔ {pr.right}</span>
            </div>
          ))}
        </div>
      );
    }
    case "listening_tts": {
      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium">🔊 {String(p.text)}</p>
          <p className="text-xs text-slate-600">{String(p.question)}</p>
          {Array.isArray(p.options) ? (
            <ul className="list-disc pl-4 text-xs">
              {(p.options as string[]).map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }
    case "comprehension": {
      return (
        <div className="space-y-2 text-sm">
          <p className="rounded bg-slate-50 p-2 text-xs dark:bg-slate-800">{String(p.passage)}</p>
          <p className="font-medium">{String(p.question)}</p>
          {Array.isArray(p.options) ? (
            <ul className="list-disc pl-4 text-xs">
              {(p.options as string[]).map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }
    case "dictation":
      return (
        <p className="text-sm">
          🎧 Dictation: &quot;{String(p.text)}&quot; — {String(p.playsAllowed)} plays
        </p>
      );
    case "writing_prompt":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">{String(p.prompt)}</p>
          <p className="text-xs text-slate-500">
            {String(p.minWords)}–{String(p.maxWords)} palabras
          </p>
        </div>
      );
    default:
      return (
        <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] dark:bg-slate-800">
          {JSON.stringify(payload, null, 2)}
        </pre>
      );
  }
}

export function ExerciseEditor({ lessonId: propLessonId, exerciseId, onSaved, onCancel }: Props) {
  const t = useTranslations("adminEditor");
  const isEdit = Boolean(exerciseId);
  const [type, setType] = useState<(typeof TYPES)[number]>("fill_blanks");
  const [lessonId, setLessonId] = useState(propLessonId ?? "");
  const [lessons, setLessons] = useState<{ id: string; title: string }[]>([]);
  const [lessonQuery, setLessonQuery] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // per-type states
  const [fillText, setFillText] = useState("She ___ (go) to school every day.");
  const [fillBlanksAnswers, setFillBlanksAnswers] = useState<Record<string, string>>({
    "blank-1": "goes",
  });
  const [orderingTokens, setOrderingTokens] = useState("I, love, learning, English");
  const [transInstruction, setTransInstruction] = useState("Rewrite in passive voice");
  const [transSentence, setTransSentence] = useState("They make shoes in Italy.");
  const [transAccepted, setTransAccepted] = useState("Shoes are made in Italy.");
  const [flashFront, setFlashFront] = useState("Apple");
  const [flashBack, setFlashBack] = useState("Manzana — a fruit");
  const [flashImageUrl, setFlashImageUrl] = useState("");
  const [matchingPairs, setMatchingPairs] = useState<{ id: string; left: string; right: string }[]>(
    [
      { id: "1", left: "Hello", right: "Hola" },
      { id: "2", left: "Goodbye", right: "Adiós" },
    ],
  );
  const [ttsText, setTtsText] = useState("Hello, how are you?");
  const [ttsQuestion, setTtsQuestion] = useState("What did you hear?");
  const [ttsOptions, setTtsOptions] = useState(
    "Hello, how are you?\nHi, how are you?\nHello, where are you?",
  );
  const [ttsAnswer, setTtsAnswer] = useState("Hello, how are you?");
  const [dictationText, setDictationText] = useState("The early bird catches the worm.");
  const [dictationPlays, setDictationPlays] = useState(1);
  const [compPassage, setCompPassage] = useState(
    "London is the capital of England. It is famous for Big Ben.",
  );
  const [compQuestion, setCompQuestion] = useState("What is famous in London?");
  const [compOptions, setCompOptions] = useState("Big Ben\nEiffel Tower\nStatue of Liberty");
  const [compAnswer, setCompAnswer] = useState("Big Ben");
  const [gradedTitle, setGradedTitle] = useState("A Day at the Market");
  const [gradedPassage, setGradedPassage] = useState(
    "Maya goes to the market to buy fresh vegetables...",
  );
  const [gradedQuestions, setGradedQuestions] = useState<
    { id: string; question: string; options: string; answer: string }[]
  >([
    {
      id: "q1",
      question: "Where does Maya go?",
      options: "Market\nSchool\nPark",
      answer: "Market",
    },
  ]);
  const [writingPrompt, setWritingPrompt] = useState("Describe your daily routine in 50 words.");
  const [writingMin, setWritingMin] = useState(30);
  const [writingMax, setWritingMax] = useState(150);
  const [writingSample, setWritingSample] = useState("I wake up at 7am, have breakfast...");
  const [speakingText, setSpeakingText] = useState("Pronounce: The weather is beautiful today.");
  const [speakingInstruction, setSpeakingInstruction] = useState("");
  const [shadowingRef, setShadowingRef] = useState("Practice shadowing this sentence naturally.");
  const [pronWord, setPronWord] = useState("schedule");
  const [pronPhonetic, setPronPhonetic] = useState("/ˈʃed.juːl/");
  const [pronExample, setPronExample] = useState("I will schedule a meeting.");

  const [images, setImages] = useState<ImageAsset[]>([]);
  const [draftUrl, setDraftUrl] = useState("");
  const [draftAlt, setDraftAlt] = useState("");
  const [draftCaption, setDraftCaption] = useState("");

  useEffect(() => {
    if (propLessonId) setLessonId(propLessonId);
  }, [propLessonId]);

  const [lessonsError, setLessonsError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/lessons?take=100");
        if (!res.ok) {
          if (!cancelled) setLessonsError(true);
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data))
          setLessons(
            data.map((l: { id: string; title: string }) => ({ id: l.id, title: l.title })),
          );
        else if (!cancelled && data.lessons) setLessons(data.lessons);
        else if (!cancelled) setLessons([]);
      } catch {
        if (!cancelled) setLessonsError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!exerciseId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/exercises/${exerciseId}`);
        if (!res.ok) throw new Error("not found");
        const ex = await res.json();
        if (cancelled) return;
        setType(ex.type);
        setLessonId(ex.lessonId);
        setDifficulty(ex.difficulty ?? 3);
        if (Array.isArray(ex.assets?.images)) setImages(ex.assets.images);
        const p = ex.prompt ?? {};
        const s = ex.solution ?? {};
        switch (ex.type) {
          case "fill_blanks":
            if (p.text) setFillText(p.text);
            if (s.answers) {
              const flat: Record<string, string> = {};
              Object.entries(s.answers as Record<string, string[]>).forEach(
                ([k, v]) => (flat[k] = (v as string[])[0] ?? ""),
              );
              setFillBlanksAnswers(flat);
            }
            break;
          case "ordering":
            if (p.tokens) setOrderingTokens((p.tokens as string[]).join(", "));
            break;
          case "transformation":
            if (p.instruction) setTransInstruction(p.instruction);
            if (p.sentence) setTransSentence(p.sentence);
            if (s.accepted) setTransAccepted((s.accepted as string[])[0] ?? "");
            break;
          case "flashcard":
            if (p.front) setFlashFront(p.front);
            if (p.back) setFlashBack(p.back);
            if (p.imageUrl) setFlashImageUrl(p.imageUrl);
            break;
          case "matching":
            if (p.pairs) setMatchingPairs(p.pairs);
            break;
          case "listening_tts":
            if (p.text) setTtsText(p.text);
            if (p.question) setTtsQuestion(p.question);
            if (p.options) setTtsOptions((p.options as string[]).join("\n"));
            if (s.answer) setTtsAnswer(s.answer);
            break;
          case "dictation":
            if (p.text) setDictationText(p.text);
            if (p.playsAllowed) setDictationPlays(p.playsAllowed);
            break;
          case "comprehension":
            if (p.passage) setCompPassage(p.passage);
            if (p.question) setCompQuestion(p.question);
            if (p.options) setCompOptions((p.options as string[]).join("\n"));
            if (s.answer) setCompAnswer(s.answer);
            break;
          case "graded_reading":
            if (p.title) setGradedTitle(p.title);
            if (p.passage) setGradedPassage(p.passage);
            if (p.questions)
              setGradedQuestions(
                (
                  p.questions as {
                    id: string;
                    question: string;
                    options: string[];
                    answer: string;
                  }[]
                ).map((q) => ({
                  id: q.id,
                  question: q.question,
                  options: q.options.join("\n"),
                  answer: q.answer,
                })),
              );
            break;
          case "writing_prompt":
            if (p.prompt) setWritingPrompt(p.prompt);
            if (p.minWords) setWritingMin(p.minWords);
            if (p.maxWords) setWritingMax(p.maxWords);
            if (s.sampleAnswer) setWritingSample(s.sampleAnswer);
            break;
          case "speaking_record":
            if (p.text) setSpeakingText(p.text);
            if (p.instruction) setSpeakingInstruction(p.instruction);
            break;
          case "shadowing":
            if (p.reference) setShadowingRef(p.reference);
            break;
          case "pronunciation":
            if (p.word) setPronWord(p.word);
            if (p.phonetic) setPronPhonetic(p.phonetic);
            if (p.example) setPronExample(p.example);
            break;
        }
      } catch (e) {
        setMsg("Error loading: " + String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const addImage = () => {
    if (!draftUrl.trim() || !draftAlt.trim()) {
      setMsg(t("imageRequires"));
      return;
    }
    const caption = draftCaption.trim();
    const next: ImageAsset = caption
      ? { url: draftUrl.trim(), alt: draftAlt.trim(), caption }
      : { url: draftUrl.trim(), alt: draftAlt.trim() };
    setImages((prev) => [...prev, next]);
    setDraftUrl("");
    setDraftAlt("");
    setDraftCaption("");
    setMsg("");
  };
  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const buildPayload = (): { prompt: unknown; solution: unknown } => {
    switch (type) {
      case "fill_blanks": {
        const parts = fillText.split("___");
        const count = parts.length - 1;
        const blanks = Array.from({ length: Math.max(count, 1) }, (_, i) => ({
          id: `blank-${i + 1}`,
        }));
        const answers: Record<string, string[]> = {};
        blanks.forEach((b) => {
          answers[b.id] = [fillBlanksAnswers[b.id] ?? ""];
        });
        if (count === 0) blanks[0]!.id = "blank-1";
        return { prompt: { text: fillText, blanks }, solution: { answers } };
      }
      case "ordering": {
        const tokens = orderingTokens
          .split(/[,\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        return { prompt: { tokens }, solution: { order: tokens } };
      }
      case "transformation":
        return {
          prompt: { instruction: transInstruction, sentence: transSentence },
          solution: { accepted: [transAccepted].filter(Boolean) },
        };
      case "flashcard": {
        const p: Record<string, unknown> = { front: flashFront, back: flashBack };
        if (flashImageUrl.trim()) p.imageUrl = flashImageUrl.trim();
        return { prompt: p, solution: { back: flashBack } };
      }
      case "matching":
        return { prompt: { pairs: matchingPairs }, solution: { pairs: matchingPairs } };
      case "listening_tts": {
        const opts = ttsOptions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const p: Record<string, unknown> = { text: ttsText, question: ttsQuestion };
        if (opts.length) p.options = opts;
        return { prompt: p, solution: { answer: ttsAnswer } };
      }
      case "dictation":
        return {
          prompt: { text: dictationText, playsAllowed: Number(dictationPlays) },
          solution: { text: dictationText },
        };
      case "comprehension": {
        const opts = compOptions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        return {
          prompt: { passage: compPassage, question: compQuestion, options: opts },
          solution: { answer: compAnswer },
        };
      }
      case "graded_reading": {
        const questions = gradedQuestions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          answer: q.answer,
        }));
        const answers: Record<string, string> = {};
        questions.forEach((q) => (answers[q.id] = q.answer));
        return {
          prompt: { title: gradedTitle, passage: gradedPassage, questions },
          solution: { answers },
        };
      }
      case "writing_prompt":
        return {
          prompt: {
            prompt: writingPrompt,
            minWords: Number(writingMin),
            maxWords: Number(writingMax),
          },
          solution: { sampleAnswer: writingSample },
        };
      case "speaking_record": {
        const p: Record<string, unknown> = { text: speakingText };
        if (speakingInstruction.trim()) p.instruction = speakingInstruction.trim();
        return { prompt: p, solution: { reference: speakingText } };
      }
      case "shadowing":
        return { prompt: { reference: shadowingRef }, solution: { reference: shadowingRef } };
      case "pronunciation": {
        const p: Record<string, unknown> = { word: pronWord };
        if (pronPhonetic.trim()) p.phonetic = pronPhonetic.trim();
        if (pronExample.trim()) p.example = pronExample.trim();
        return { prompt: p, solution: { word: pronWord } };
      }
      default:
        return { prompt: {}, solution: {} };
    }
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!lessonId) e.lessonId = "Selecciona lección — obligatorio.";
    if (!type) e.type = "Elige tipo.";
    if (difficulty < 1 || difficulty > 5) e.difficulty = "Dificultad 1-5.";
    if (type === "fill_blanks" && !fillText.includes("___"))
      e.fillText = "Usa ___ para marcar huecos.";
    if (type === "ordering" && !orderingTokens.trim())
      e.ordering = "Añade tokens separados por coma.";
    if (type === "flashcard" && (!flashFront.trim() || !flashBack.trim()))
      e.flash = "Front y Back obligatorios.";
    return e;
  }, [lessonId, type, difficulty, fillText, orderingTokens, flashFront, flashBack]);

  const step1Valid = !errors.lessonId && !errors.type && !errors.difficulty;

  const submit = async () => {
    setMsg(t("submitting"));
    setLoading(true);
    try {
      if (!lessonId) throw new Error("Selecciona lección");
      const { prompt, solution } = buildPayload();
      if (type === "fill_blanks" && !fillText.includes("___"))
        throw new Error("fill_blanks: usa ___ para marcar huecos");
      const assets = images.length ? { images } : undefined;
      const body = {
        lessonId,
        type,
        difficulty: Number(difficulty),
        prompt,
        solution,
        ...(assets ? { assets } : {}),
      };
      const url = isEdit ? `/api/admin/exercises/${exerciseId}` : "/api/admin/exercises";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error));
      setMsg(t("savedPrefix") + data.id);
      if (onSaved) onSaved(data.id);
    } catch (e) {
      setMsg(t("errorPrefix") + String(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const payloadPreview = (() => {
    try {
      return buildPayload();
    } catch {
      return null;
    }
  })();

  const filteredLessons = useMemo(() => {
    if (!lessonQuery.trim()) return lessons;
    const low = lessonQuery.toLowerCase();
    return lessons.filter(
      (l) => l.title.toLowerCase().includes(low) || l.id.toLowerCase().includes(low),
    );
  }, [lessons, lessonQuery]);

  const selectedLessonTitle =
    lessons.find((l) => l.id === lessonId)?.title ?? (lessonId ? lessonId.slice(0, 8) : "");

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      aria-label={t("editorAria")}
    >
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-800">
        <h3 className="font-semibold">
          {isEdit ? "Editar ejercicio" : t("title")} — asistente guiado
        </h3>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border px-3 py-1 text-xs dark:border-slate-700"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(s.id as 1 | 2 | 3)}
                  className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left ${isActive ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30" : isDone ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"}`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isDone ? "bg-emerald-600 text-white" : isActive ? "bg-indigo-600 text-white" : "bg-slate-300 text-slate-700 dark:bg-slate-600"}`}
                  >
                    {isDone ? "✓" : s.id}
                  </span>
                  <span>
                    <span className="block text-xs leading-none font-semibold">
                      {s.icon} {s.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.desc}</span>
                  </span>
                </button>
                {idx < STEPS.length - 1 ? (
                  <span className="hidden h-px w-4 bg-slate-200 sm:block dark:bg-slate-700" />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-4">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs dark:border-indigo-900/30 dark:bg-indigo-950/20">
              <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                Paso 1 — Tipo y lección
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Elige el tipo de ejercicio y busca tu lección por título. Sin copiar IDs a mano.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-medium">
                <FieldHelp tip="13 tipos — cada uno muestra su formulario en el paso 2.">
                  Tipo *
                </FieldHelp>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as never);
                    setTouched((t) => ({ ...t, type: true }));
                  }}
                  className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:bg-slate-900 ${touched.type && errors.type ? "border-red-300" : "border-slate-200 dark:border-slate-700"}`}
                >
                  {TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                {touched.type && errors.type ? (
                  <span className="text-[11px] text-red-600">{errors.type}</span>
                ) : null}
              </label>

              <label className="text-xs font-medium sm:col-span-2">
                <FieldHelp tip="Busca por título — selector con búsqueda. Si falla (403), usa input manual.">
                  Lección *
                </FieldHelp>
                {lessons.length || !lessonsError ? (
                  <div className="mt-1 space-y-1">
                    <div className="relative">
                      <span className="pointer-events-none absolute top-2 left-2 text-slate-400">
                        🔍
                      </span>
                      <input
                        value={lessonQuery}
                        onChange={(e) => setLessonQuery(e.target.value)}
                        placeholder="Buscar lección por título…"
                        className="w-full rounded-xl border bg-slate-50 py-2 pr-2 pl-7 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <select
                      value={lessonId}
                      onChange={(e) => {
                        setLessonId(e.target.value);
                        setTouched((t) => ({ ...t, lessonId: true }));
                      }}
                      className={`w-full rounded-xl border bg-white px-2 py-2 text-sm dark:bg-slate-900 ${touched.lessonId && errors.lessonId ? "border-red-300 bg-red-50" : "border-slate-200 dark:border-slate-700"}`}
                    >
                      <option value="">Selecciona lección</option>
                      {filteredLessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title.slice(0, 60)}
                        </option>
                      ))}
                    </select>
                    {lessonId ? (
                      <p className="text-[11px] text-slate-500">
                        Seleccionada: <span className="font-medium">{selectedLessonTitle}</span>{" "}
                        <span className="font-mono text-[10px]">({lessonId.slice(0, 8)})</span>
                      </p>
                    ) : null}
                    {filteredLessons.length === 0 && lessonQuery ? (
                      <p className="text-[11px] text-amber-600">
                        Sin resultados para &quot;{lessonQuery}&quot; — prueba otro término.
                      </p>
                    ) : null}
                    {touched.lessonId && errors.lessonId ? (
                      <span className="text-[11px] text-red-600">{errors.lessonId}</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-1">
                    <input
                      value={lessonId}
                      onChange={(e) => {
                        setLessonId(e.target.value);
                        setTouched((t) => ({ ...t, lessonId: true }));
                      }}
                      placeholder={t("lessonPlaceholder")}
                      className={`w-full rounded-xl border px-2 py-2 text-xs dark:bg-slate-900 ${touched.lessonId && errors.lessonId ? "border-red-300" : "border-slate-200 dark:border-slate-700"}`}
                    />
                    <p className="mt-1 text-[11px] text-amber-600">
                      API de lecciones no disponible (403) — pega el ID manual. Pide a un admin que
                      te dé acceso o revisa /api/admin/lessons.
                    </p>
                    {touched.lessonId && errors.lessonId ? (
                      <span className="text-[11px] text-red-600">{errors.lessonId}</span>
                    ) : null}
                  </div>
                )}
              </label>

              <label className="text-xs font-medium">
                <FieldHelp tip="1=fácil, 5=difícil — se usa para ordenar y gamificar.">
                  Dificultad 1-5 *
                </FieldHelp>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(parseInt(e.target.value || "3", 10));
                    setTouched((t) => ({ ...t, difficulty: true }));
                  }}
                  className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm dark:bg-slate-900 ${touched.difficulty && errors.difficulty ? "border-red-300" : "border-slate-200 dark:border-slate-700"}`}
                />
                {touched.difficulty && errors.difficulty ? (
                  <span className="text-[11px] text-red-600">{errors.difficulty}</span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Consejo: usa 3 para nivel medio.
                  </span>
                )}
              </label>
              <div className="flex items-end sm:col-span-2">
                <div className="rounded-xl border bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                  <p className="font-semibold">Ayuda contextual</p>
                  <p className="text-slate-500">
                    Pasa el cursor sobre{" "}
                    <span className="rounded-full bg-white px-1 dark:bg-slate-700">?</span> para
                    saber para qué sirve cada campo. El preview del paso 3 muestra cómo lo verá el
                    estudiante.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="self-center text-xs text-slate-500">Paso 1 de 3</span>
              <button
                type="button"
                onClick={() => {
                  setTouched({ lessonId: true, type: true, difficulty: true });
                  if (!step1Valid) {
                    setMsg("Corrige los campos marcados.");
                    return;
                  }
                  setMsg("");
                  setStep(2);
                }}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Siguiente → Contenido
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-xs dark:border-sky-900/30 dark:bg-sky-950/20">
              <p className="font-semibold text-sky-900 dark:text-sky-100">
                Paso 2 — Contenido del ejercicio ({type})
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Completa el formulario específico. El JSON se genera solo — no toques código.
              </p>
            </div>

            <div className="rounded-xl border p-3 dark:border-slate-700">
              {type === "fill_blanks" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-medium">
                    <FieldHelp tip="Usa ___ exactamente 3 guiones bajos por hueco. Ej: She ___ (go)">
                      Texto con huecos — usa ___
                    </FieldHelp>
                    <textarea
                      value={fillText}
                      onChange={(e) => {
                        setFillText(e.target.value);
                        setTouched((t) => ({ ...t, fillText: true }));
                      }}
                      rows={2}
                      className={`mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:bg-slate-900 ${touched.fillText && errors.fillText ? "border-red-300 bg-red-50" : "border-slate-200 dark:border-slate-700"}`}
                      placeholder="I ___ going to the market."
                    />
                    {touched.fillText && errors.fillText ? (
                      <span className="text-[11px] text-red-600">{errors.fillText}</span>
                    ) : null}
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from(
                      { length: Math.max(fillText.split("___").length - 1, 1) },
                      (_, i) => {
                        const id = `blank-${i + 1}`;
                        return (
                          <label key={id} className="text-xs">
                            Respuesta {id}
                            <input
                              value={fillBlanksAnswers[id] ?? ""}
                              onChange={(e) =>
                                setFillBlanksAnswers((prev) => ({ ...prev, [id]: e.target.value }))
                              }
                              placeholder="goes"
                              className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                            />
                          </label>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : null}
              {type === "ordering" ? (
                <label className="block text-xs font-medium">
                  <FieldHelp tip="Separa por coma — se mezclarán para el estudiante.">
                    Tokens en orden correcto — separa por coma
                  </FieldHelp>
                  <input
                    value={orderingTokens}
                    onChange={(e) => setOrderingTokens(e.target.value)}
                    placeholder="I, love, learning, English"
                    className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Preview:{" "}
                    {orderingTokens
                      .split(",")
                      .map((s) => s.trim())
                      .join(" / ")}
                  </p>
                </label>
              ) : null}
              {type === "transformation" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Instruction{" "}
                    <input
                      value={transInstruction}
                      onChange={(e) => setTransInstruction(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Sentence{" "}
                    <input
                      value={transSentence}
                      onChange={(e) => setTransSentence(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Accepted answer{" "}
                    <input
                      value={transAccepted}
                      onChange={(e) => setTransAccepted(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
              ) : null}
              {type === "flashcard" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Front{" "}
                    <input
                      value={flashFront}
                      onChange={(e) => setFlashFront(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Back{" "}
                    <input
                      value={flashBack}
                      onChange={(e) => setFlashBack(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Image URL (optional){" "}
                    <input
                      value={flashImageUrl}
                      onChange={(e) => setFlashImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    {flashImageUrl ? (
                      <img
                        src={flashImageUrl}
                        alt="flash"
                        className="mt-2 max-h-32 rounded object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : null}
                  </label>
                </div>
              ) : null}
              {type === "matching" ? (
                <div className="space-y-2">
                  {matchingPairs.map((p, idx) => (
                    <div key={p.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={p.left}
                        onChange={(e) =>
                          setMatchingPairs((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, left: e.target.value } : x)),
                          )
                        }
                        placeholder="Left"
                        className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                      <input
                        value={p.right}
                        onChange={(e) =>
                          setMatchingPairs((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, right: e.target.value } : x)),
                          )
                        }
                        placeholder="Right"
                        className="rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setMatchingPairs((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded-xl border px-2 py-1 text-xs dark:border-slate-700"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setMatchingPairs((prev) => [
                        ...prev,
                        { id: String(Date.now()), left: "", right: "" },
                      ])
                    }
                    className="rounded-xl bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                  >
                    + Pair
                  </button>
                </div>
              ) : null}
              {type === "listening_tts" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Text to listen{" "}
                    <textarea
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Question{" "}
                    <input
                      value={ttsQuestion}
                      onChange={(e) => setTtsQuestion(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Options (one per line, optional){" "}
                    <textarea
                      value={ttsOptions}
                      onChange={(e) => setTtsOptions(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Correct answer{" "}
                    <input
                      value={ttsAnswer}
                      onChange={(e) => setTtsAnswer(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
              ) : null}
              {type === "dictation" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Text{" "}
                    <textarea
                      value={dictationText}
                      onChange={(e) => setDictationText(e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Plays allowed{" "}
                    <input
                      type="number"
                      min={1}
                      value={dictationPlays}
                      onChange={(e) => setDictationPlays(parseInt(e.target.value || "1", 10))}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
              ) : null}
              {type === "comprehension" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Passage{" "}
                    <textarea
                      value={compPassage}
                      onChange={(e) => setCompPassage(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Question{" "}
                    <input
                      value={compQuestion}
                      onChange={(e) => setCompQuestion(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Options (one per line){" "}
                    <textarea
                      value={compOptions}
                      onChange={(e) => setCompOptions(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Correct answer{" "}
                    <input
                      value={compAnswer}
                      onChange={(e) => setCompAnswer(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
              ) : null}
              {type === "graded_reading" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Title{" "}
                    <input
                      value={gradedTitle}
                      onChange={(e) => setGradedTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Passage{" "}
                    <textarea
                      value={gradedPassage}
                      onChange={(e) => setGradedPassage(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <div className="space-y-2">
                    {gradedQuestions.map((q, idx) => (
                      <div key={q.id} className="rounded-xl border p-2 dark:border-slate-700">
                        <input
                          value={q.question}
                          onChange={(e) =>
                            setGradedQuestions((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, question: e.target.value } : x,
                              ),
                            )
                          }
                          placeholder="Question"
                          className="w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                        <textarea
                          value={q.options}
                          onChange={(e) =>
                            setGradedQuestions((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, options: e.target.value } : x,
                              ),
                            )
                          }
                          placeholder="Options one per line"
                          rows={2}
                          className="mt-1 w-full rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                        />
                        <input
                          value={q.answer}
                          onChange={(e) =>
                            setGradedQuestions((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, answer: e.target.value } : x,
                              ),
                            )
                          }
                          placeholder="Correct answer"
                          className="mt-1 w-full rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setGradedQuestions((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="mt-1 rounded-xl border px-2 py-1 text-xs dark:border-slate-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setGradedQuestions((prev) => [
                          ...prev,
                          { id: `q${Date.now()}`, question: "", options: "", answer: "" },
                        ])
                      }
                      className="rounded-xl bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                    >
                      + Question
                    </button>
                  </div>
                </div>
              ) : null}
              {type === "writing_prompt" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Prompt{" "}
                    <textarea
                      value={writingPrompt}
                      onChange={(e) => setWritingPrompt(e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs">
                      Min words{" "}
                      <input
                        type="number"
                        value={writingMin}
                        onChange={(e) => setWritingMin(parseInt(e.target.value || "0", 10))}
                        className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </label>
                    <label className="text-xs">
                      Max words{" "}
                      <input
                        type="number"
                        value={writingMax}
                        onChange={(e) => setWritingMax(parseInt(e.target.value || "0", 10))}
                        className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </label>
                  </div>
                  <label className="text-xs">
                    Sample answer{" "}
                    <textarea
                      value={writingSample}
                      onChange={(e) => setWritingSample(e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
              ) : null}
              {type === "speaking_record" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Text to pronounce{" "}
                    <textarea
                      value={speakingText}
                      onChange={(e) => setSpeakingText(e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Instruction (optional){" "}
                    <input
                      value={speakingInstruction}
                      onChange={(e) => setSpeakingInstruction(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
              ) : null}
              {type === "shadowing" ? (
                <label className="block text-xs">
                  Reference text{" "}
                  <textarea
                    value={shadowingRef}
                    onChange={(e) => setShadowingRef(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
              ) : null}
              {type === "pronunciation" ? (
                <div className="grid gap-2">
                  <label className="text-xs">
                    Word{" "}
                    <input
                      value={pronWord}
                      onChange={(e) => setPronWord(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Phonetic (optional){" "}
                    <input
                      value={pronPhonetic}
                      onChange={(e) => setPronPhonetic(e.target.value)}
                      placeholder="/ˈʃed.juːl/"
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs">
                    Example (optional){" "}
                    <input
                      value={pronExample}
                      onChange={(e) => setPronExample(e.target.value)}
                      placeholder="I will schedule a meeting."
                      className="mt-1 w-full rounded-xl border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <fieldset className="rounded-xl border p-3 dark:border-slate-700">
              <legend className="px-1 text-xs font-semibold">{t("imagesTitle")}</legend>
              <p className="text-[11px] text-slate-500">
                {t("imagesDesc")} — preview local incluido.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_2fr_1.5fr_auto]">
                <input
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder={t("imageUrlPlaceholder")}
                  className="rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  value={draftAlt}
                  onChange={(e) => setDraftAlt(e.target.value)}
                  placeholder={t("imageAltPlaceholder")}
                  className="rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                  placeholder={t("captionPlaceholder")}
                  className="rounded-xl border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="rounded-xl bg-slate-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-slate-900"
                >
                  {t("add")}
                </button>
              </div>
              {draftUrl.trim() ? (
                <div className="mt-2 flex gap-2">
                  <div className="h-16 w-16 overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draftUrl}
                      alt="draft preview"
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                  <p className="self-center text-[11px] text-slate-500">Preview URL actual</p>
                </div>
              ) : null}
              {images.length > 0 ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {images.map((img, idx) => (
                    <li
                      key={idx}
                      className="flex gap-2 rounded-xl border p-2 dark:border-slate-700"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{img.alt}</p>
                        <p className="truncate text-[11px] text-slate-500">{img.url}</p>
                        {img.caption ? (
                          <p className="text-[11px] text-slate-500">{img.caption}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="h-fit rounded-xl border bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                      >
                        {t("remove")}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-400">{t("noImages")}</p>
              )}
            </fieldset>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
              >
                ← Volver
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
              >
                Siguiente → Preview
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                Paso 3 — Preview del ejercicio real
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Revisa cómo lo verá el estudiante. Si está bien, guarda. Los datos se validan antes
                de enviar.
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold">
                Preview real — tipo:{" "}
                <span className="rounded bg-white px-2 py-0.5 dark:bg-slate-900">{type}</span> ·
                Lección: {selectedLessonTitle || lessonId.slice(0, 8)} · Dif {difficulty}
              </p>
              <div className="mt-3 rounded-xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <ExerciseRealPreview type={type} payload={payloadPreview} />
              </div>
              {images.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {images.map((img, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900"
                    >
                      🖼️ {img.alt}
                    </span>
                  ))}
                </div>
              ) : null}
              <details className="mt-3 rounded-xl border bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                <summary className="cursor-pointer text-xs font-semibold">
                  Ver JSON generado (para debug)
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] dark:bg-slate-800">
                  {JSON.stringify(payloadPreview, null, 2)}
                </pre>
              </details>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border px-4 py-2 text-sm dark:border-slate-700"
              >
                ← Editar contenido
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500" aria-live="polite">
                  {msg}
                </span>
                <button
                  onClick={submit}
                  disabled={loading || !step1Valid}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {loading ? t("submitting") : isEdit ? "Guardar cambios" : t("save")}
                </button>
              </div>
            </div>
            {!step1Valid ? (
              <p className="text-xs text-red-600">Corrige el Paso 1 antes de guardar.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
