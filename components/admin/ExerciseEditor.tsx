"use client";
import { useEffect, useState } from "react";
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

export function ExerciseEditor({ lessonId: propLessonId, exerciseId, onSaved, onCancel }: Props) {
  const t = useTranslations("adminEditor");
  const isEdit = Boolean(exerciseId);
  const [type, setType] = useState<(typeof TYPES)[number]>("fill_blanks");
  const [lessonId, setLessonId] = useState(propLessonId ?? "");
  const [lessons, setLessons] = useState<{ id: string; title: string }[]>([]);
  const [difficulty, setDifficulty] = useState(3);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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

  // fetch lessons for selector if no lessonId prop
  useEffect(() => {
    if (propLessonId) setLessonId(propLessonId);
  }, [propLessonId]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/lessons?take=100");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data))
          setLessons(
            data.map((l: { id: string; title: string }) => ({ id: l.id, title: l.title })),
          );
        else if (!cancelled && data.lessons) setLessons(data.lessons);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // load existing exercise for edit
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
        // try to populate per-type fields from prompt/solution
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
      case "transformation": {
        return {
          prompt: { instruction: transInstruction, sentence: transSentence },
          solution: { accepted: [transAccepted].filter(Boolean) },
        };
      }
      case "flashcard": {
        const p: Record<string, unknown> = { front: flashFront, back: flashBack };
        if (flashImageUrl.trim()) p.imageUrl = flashImageUrl.trim();
        return { prompt: p, solution: { back: flashBack } };
      }
      case "matching": {
        return { prompt: { pairs: matchingPairs }, solution: { pairs: matchingPairs } };
      }
      case "listening_tts": {
        const opts = ttsOptions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const p: Record<string, unknown> = { text: ttsText, question: ttsQuestion };
        if (opts.length) p.options = opts;
        return { prompt: p, solution: { answer: ttsAnswer } };
      }
      case "dictation": {
        return {
          prompt: { text: dictationText, playsAllowed: Number(dictationPlays) },
          solution: { text: dictationText },
        };
      }
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
      case "writing_prompt": {
        return {
          prompt: {
            prompt: writingPrompt,
            minWords: Number(writingMin),
            maxWords: Number(writingMax),
          },
          solution: { sampleAnswer: writingSample },
        };
      }
      case "speaking_record": {
        const p: Record<string, unknown> = { text: speakingText };
        if (speakingInstruction.trim()) p.instruction = speakingInstruction.trim();
        return { prompt: p, solution: { reference: speakingText } };
      }
      case "shadowing": {
        return { prompt: { reference: shadowingRef }, solution: { reference: shadowingRef } };
      }
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

  const submit = async () => {
    setMsg(t("submitting"));
    setLoading(true);
    try {
      if (!lessonId) throw new Error("Selecciona lección");
      const { prompt, solution } = buildPayload();
      // simple client validation
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

  return (
    <div
      className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      aria-label={t("editorAria")}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {isEdit ? "Editar ejercicio" : t("title")} — sin JSON manual
        </h3>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-2 py-1 text-xs dark:border-slate-700"
          >
            Cancelar
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium">
          Tipo*
          <select
            value={type}
            onChange={(e) => setType(e.target.value as never)}
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Lección*
          {lessons.length ? (
            <select
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Selecciona lección</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title.slice(0, 60)}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              placeholder={t("lessonPlaceholder")}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          )}
        </label>
        <label className="text-xs font-medium">
          Dificultad 1-5
          <input
            type="number"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => setDifficulty(parseInt(e.target.value || "3", 10))}
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>

      {/* TYPE-SPECIFIC FORMS */}
      <div className="mt-4 rounded border border-slate-200 p-3 dark:border-slate-700">
        {type === "fill_blanks" ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium">
              Texto con huecos — usa ___ para cada blank
              <textarea
                value={fillText}
                onChange={(e) => setFillText(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="I ___ going to the market."
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: Math.max(fillText.split("___").length - 1, 1) }, (_, i) => {
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
                      className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              Se guardará como prompt {`{text, blanks:[id]}`} y solution{" "}
              {`{answers:{id:[correct]}}`}.
            </p>
          </div>
        ) : null}
        {type === "ordering" ? (
          <label className="block text-xs font-medium">
            Tokens en orden correcto — separa por coma
            <input
              value={orderingTokens}
              onChange={(e) => setOrderingTokens(e.target.value)}
              placeholder="I, love, learning, English"
              className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Sentence{" "}
              <input
                value={transSentence}
                onChange={(e) => setTransSentence(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Accepted answer{" "}
              <input
                value={transAccepted}
                onChange={(e) => setTransAccepted(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Back{" "}
              <input
                value={flashBack}
                onChange={(e) => setFlashBack(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Image URL (optional){" "}
              <input
                value={flashImageUrl}
                onChange={(e) => setFlashImageUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                  className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  value={p.right}
                  onChange={(e) =>
                    setMatchingPairs((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, right: e.target.value } : x)),
                    )
                  }
                  placeholder="Right"
                  className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setMatchingPairs((prev) => prev.filter((_, i) => i !== idx))}
                  className="rounded border px-2 py-1 text-xs dark:border-slate-700"
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
              className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Question{" "}
              <input
                value={ttsQuestion}
                onChange={(e) => setTtsQuestion(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Options (one per line, optional){" "}
              <textarea
                value={ttsOptions}
                onChange={(e) => setTtsOptions(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Correct answer{" "}
              <input
                value={ttsAnswer}
                onChange={(e) => setTtsAnswer(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Plays allowed{" "}
              <input
                type="number"
                min={1}
                value={dictationPlays}
                onChange={(e) => setDictationPlays(parseInt(e.target.value || "1", 10))}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Question{" "}
              <input
                value={compQuestion}
                onChange={(e) => setCompQuestion(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Options (one per line){" "}
              <textarea
                value={compOptions}
                onChange={(e) => setCompOptions(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Correct answer{" "}
              <input
                value={compAnswer}
                onChange={(e) => setCompAnswer(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Passage{" "}
              <textarea
                value={gradedPassage}
                onChange={(e) => setGradedPassage(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <div className="space-y-2">
              {gradedQuestions.map((q, idx) => (
                <div key={q.id} className="rounded border p-2 dark:border-slate-700">
                  <input
                    value={q.question}
                    onChange={(e) =>
                      setGradedQuestions((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, question: e.target.value } : x)),
                      )
                    }
                    placeholder="Question"
                    className="w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                  <textarea
                    value={q.options}
                    onChange={(e) =>
                      setGradedQuestions((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, options: e.target.value } : x)),
                      )
                    }
                    placeholder="Options one per line"
                    rows={2}
                    className="mt-1 w-full rounded border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <input
                    value={q.answer}
                    onChange={(e) =>
                      setGradedQuestions((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, answer: e.target.value } : x)),
                      )
                    }
                    placeholder="Correct answer"
                    className="mt-1 w-full rounded border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setGradedQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    className="mt-1 rounded border px-2 py-1 text-xs dark:border-slate-700"
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
                className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                Min words{" "}
                <input
                  type="number"
                  value={writingMin}
                  onChange={(e) => setWritingMin(parseInt(e.target.value || "0", 10))}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="text-xs">
                Max words{" "}
                <input
                  type="number"
                  value={writingMax}
                  onChange={(e) => setWritingMax(parseInt(e.target.value || "0", 10))}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
            </div>
            <label className="text-xs">
              Sample answer{" "}
              <textarea
                value={writingSample}
                onChange={(e) => setWritingSample(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Instruction (optional){" "}
              <input
                value={speakingInstruction}
                onChange={(e) => setSpeakingInstruction(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
              className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Phonetic (optional){" "}
              <input
                value={pronPhonetic}
                onChange={(e) => setPronPhonetic(e.target.value)}
                placeholder="/ˈʃed.juːl/"
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs">
              Example (optional){" "}
              <input
                value={pronExample}
                onChange={(e) => setPronExample(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>
        ) : null}
      </div>

      <fieldset className="mt-4 rounded border border-slate-200 p-3 dark:border-slate-700">
        <legend className="px-1 text-xs font-semibold">{t("imagesTitle")}</legend>
        <p className="text-[11px] text-gray-500">{t("imagesDesc")} — preview local incluido.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_2fr_1.5fr_auto]">
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder={t("imageUrlPlaceholder")}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            value={draftAlt}
            onChange={(e) => setDraftAlt(e.target.value)}
            placeholder={t("imageAltPlaceholder")}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
            placeholder={t("captionPlaceholder")}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={addImage}
            className="rounded bg-slate-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-slate-900"
          >
            {t("add")}
          </button>
        </div>
        {draftUrl.trim() ? (
          <div className="mt-2 flex gap-2">
            <div className="h-16 w-16 overflow-hidden rounded border bg-slate-100 dark:bg-slate-800">
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
                className="flex gap-2 rounded border border-slate-200 p-2 dark:border-slate-700"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{img.alt}</p>
                  <p className="truncate text-[11px] text-gray-500">{img.url}</p>
                  {img.caption ? <p className="text-[11px] text-gray-500">{img.caption}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="h-fit rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-gray-400">{t("noImages")}</p>
        )}
      </fieldset>

      {/* Preview */}
      {payloadPreview ? (
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-semibold">
            Preview (cómo lo ve el estudiante) — prompt/solution JSON generado
          </p>
          <pre className="mt-2 max-h-60 overflow-auto rounded bg-white p-2 text-[11px] dark:bg-slate-900">
            {JSON.stringify(payloadPreview, null, 2)}
          </pre>
        </div>
      ) : null}

      <button
        onClick={submit}
        disabled={loading}
        className="bg-primary mt-3 rounded px-4 py-2 text-sm text-white disabled:opacity-50"
        aria-label={t("saveAria")}
      >
        {loading ? t("submitting") : isEdit ? "Guardar cambios" : t("save")}
      </button>
      {msg ? (
        <p className="mt-2 text-xs" aria-live="polite">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
