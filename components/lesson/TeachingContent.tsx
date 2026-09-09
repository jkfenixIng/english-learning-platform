"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import type { LessonContent, LessonContentBlock } from "@/lib/lesson/types";
import { localizeBlock } from "@/lib/lesson/localize";
import { cn } from "@/lib/utils/cn";

interface Props {
  content: LessonContent | null | undefined;
  bodyMarkdown?: string | null;
  coverImage?: string | null;
  title?: string;
  className?: string;
  locale?: string;
}

function BlockRenderer({ block, locale }: { block: LessonContentBlock; locale: string }) {
  const tTeaching = useTranslations("lesson.teachingContent");
  const b = localizeBlock(block, locale);
  switch (b.type) {
    case "heading": {
      const Tag = b.level === 3 ? "h3" : "h2";
      return (
        <Tag className={cn("font-semibold tracking-tight", b.level === 3 ? "text-lg" : "text-xl")}>
          {b.text}
        </Tag>
      );
    }
    case "paragraph":
      return <p className="leading-relaxed text-gray-700 dark:text-gray-300">{b.text}</p>;
    case "image": {
      const src = b.url?.trim() ? b.url : "/lesson-images/teaching-placeholder.png";
      const alt = b.alt?.trim() ? b.alt : "Lesson illustration";
      const caption = b.caption;
      const needsUnoptimized = src.includes("picsum.photos");
      return (
        <figure className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative aspect-[16/9] w-full bg-slate-50 dark:bg-slate-800">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              unoptimized={needsUnoptimized}
            />
          </div>
          {caption ? (
            <figcaption className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    case "vocab": {
      const vb = b as Extract<LessonContentBlock, { type: "vocab" }>;
      return (
        <div className="rounded-xl border bg-amber-50/60 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <p className="mb-2 text-xs font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-200">
            {tTeaching("keyVocab")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {vb.items.map((item) => (
              <div key={item.word} className="rounded-lg bg-white p-3 shadow-sm dark:bg-gray-900">
                <p className="text-sm font-semibold">{item.word}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.definition}</p>
                {item.example ? (
                  <p className="mt-1 text-xs text-gray-500 italic">“{item.example}”</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "example": {
      const eb = b as Extract<LessonContentBlock, { type: "example" }>;
      return (
        <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50/60 p-4 dark:bg-indigo-950/20">
          {eb.title ? (
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{eb.title}</p>
          ) : null}
          <p className="mt-1 text-sm leading-relaxed text-gray-800 dark:text-gray-200">{eb.text}</p>
          {eb.translation ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{eb.translation}</p>
          ) : null}
        </div>
      );
    }
    case "list": {
      const lb = b as Extract<LessonContentBlock, { type: "list" }>;
      return lb.ordered ? (
        <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700 dark:text-gray-300">
          {lb.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
          {lb.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
    case "callout": {
      const cb = b as Extract<LessonContentBlock, { type: "callout" }>;
      const variantClasses =
        cb.variant === "warning"
          ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
          : cb.variant === "tip"
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-sky-400 bg-sky-50 dark:bg-sky-950/30";
      return (
        <div className={cn("rounded-xl border-l-4 p-4 text-sm", variantClasses)}>{cb.text}</div>
      );
    }
    default:
      return null;
  }
}

export function TeachingContent({
  content,
  bodyMarkdown,
  coverImage,
  title,
  className,
  locale: localeProp,
}: Props) {
  const t = useTranslations("lesson.teachingContent");
  const hookLocale = useLocale();
  const locale = localeProp ?? hookLocale;
  const blocks = content?.blocks ?? [];
  const hasBlocks = blocks.length > 0;
  const hasMarkdown = Boolean(bodyMarkdown && bodyMarkdown.trim().length > 0);

  if (!hasBlocks && !hasMarkdown && !coverImage) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
          className,
        )}
      >
        <div className="relative aspect-[16/9] w-full bg-slate-50 dark:bg-slate-800">
          <Image
            src="/lesson-images/teaching-placeholder.png"
            alt={title ?? t("coverFallback")}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            aria-hidden
          />
          <div className="absolute bottom-0 p-4">
            <p className="text-sm font-semibold text-white drop-shadow">
              {t("comingSoon", { title: title ?? t("comingSoonFallback") })}
            </p>
            <p className="mt-1 text-xs text-white/80">{t("addBlocksHint")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      {coverImage ? (
        <div className="overflow-hidden rounded-xl border bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="relative aspect-[16/9] w-full bg-gray-100 dark:bg-gray-800">
            <Image
              src={coverImage}
              alt={title ? t("coverAlt", { title }) : t("coverFallback")}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              priority={false}
              unoptimized={Boolean(coverImage?.includes("picsum.photos"))}
            />
          </div>
        </div>
      ) : null}

      {hasBlocks ? (
        <div className="space-y-4">
          {blocks.map((block, idx) => (
            <BlockRenderer key={idx} block={block} locale={locale} />
          ))}
        </div>
      ) : null}

      {hasMarkdown ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {bodyMarkdown!.split("\n\n").map((para, i) => (
            <p key={i} className="leading-relaxed text-gray-700 dark:text-gray-300">
              {para}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
