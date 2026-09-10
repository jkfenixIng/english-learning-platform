"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import type { LessonContent, LessonContentBlock } from "@/lib/lesson/types";
import { localizeBlock } from "@/lib/lesson/localize";
import { cn } from "@/lib/utils/cn";
import { isValidCanonicalImageName } from "@/lib/curriculum/imageNaming";

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
      const rawSrc = b.url?.trim() ? b.url.trim() : "/lesson-images/teaching-placeholder.png";
      const alt = b.alt?.trim() ? b.alt : "Lesson illustration";
      const caption = b.caption;

      // PR2 alias fallback: canonical-first. Client keeps canonical src;
      // onError tries heuristic legacy alias before placeholder (resolver canonical->alias).
      const getFallbackForCanonical = (src: string): string | null => {
        const filename = src.split("/").pop() ?? "";
        if (!isValidCanonicalImageName(filename)) return null;
        // heuristic legacy: lessons/{level}-u{module}-l{num}.png
        const m = /^([a-c][12])_m([1-4])_(?:img|audio|ill)_([a-z0-9_]+)\.png$/.exec(filename);
        if (!m) return null;
        const level = m[1]!;
        const mod = m[2]!;
        const descriptor = m[3]!;
        const lessonNum = /^l[1-3]$/.test(descriptor) ? descriptor.slice(1) : "1";
        return `/lesson-images/lessons/${level}-u${mod}-l${lessonNum}.png`;
      };

      return (
        <figure className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative aspect-[16/9] w-full bg-slate-50 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rawSrc}
              alt={alt}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                if (el.src.endsWith("teaching-placeholder.png")) return;
                // try alias once before placeholder
                const alias = getFallbackForCanonical(el.src);
                if (alias && !el.dataset.aliased) {
                  el.dataset.aliased = "1";
                  // avoid infinite loop if alias itself 404 — next error hits placeholder
                  el.src = alias;
                  return;
                }
                el.src = "/lesson-images/teaching-placeholder.png";
              }}
              loading="lazy"
            />
            <span className="sr-only">{alt}</span>
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
    case "video": {
      const vb = b as Extract<LessonContentBlock, { type: "video" }>;
      const embed = toEmbedUrl(vb.url);
      const title = (vb as unknown as { title?: string }).title ?? "Lesson video";
      const caption = (vb as unknown as { caption?: string }).caption;
      if (!embed) {
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-amber-800 dark:text-amber-200">Invalid video URL: {vb.url}</p>
          </div>
        );
      }
      return (
        <figure className="overflow-hidden rounded-xl border bg-black shadow-sm dark:border-slate-800">
          <div className="relative aspect-video w-full">
            <iframe
              src={embed}
              title={title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
          {caption ? (
            <figcaption className="bg-white px-3 py-2 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    default:
      return null;
  }
}

function toEmbedUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  // Already embed form
  if (url.includes("youtube.com/embed/") || url.includes("player.vimeo.com/video/")) return url;
  // youtube watch?v= , youtu.be/
  const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
  // youtube.com/shorts/
  const ytShort = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  // vimeo vimeo.com/123456
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  // If http(s) and looks like embed already or generic iframe src, allow it? Only allow https
  try {
    const u = new URL(url);
    if ((u.protocol === "https:" && u.hostname.includes("youtube")) || u.hostname.includes("vimeo"))
      return url;
  } catch {}
  return null;
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
