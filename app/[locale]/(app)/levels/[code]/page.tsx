import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "../../../../../lib/db";
import { NavigationToggle } from "../../../../../components/cefr/NavigationToggle";
import {
  getLevelTitle,
  getLevelDescription,
  getUnitTitle,
  getUnitDescription,
} from "../../../../../lib/lesson/localize";

type UnitRow = {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  coverImage: string | null;
};

const LEVEL_CODES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function Breadcrumbs({ code, locale }: { code: string; locale: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500 dark:text-slate-400">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link
            href="/dashboard"
            className="hover:text-slate-700 hover:underline dark:hover:text-slate-200"
          >
            Dashboard
          </Link>
        </li>
        <li aria-hidden className="text-slate-400">
          ›
        </li>
        <li>
          <Link
            href="/levels"
            className="hover:text-slate-700 hover:underline dark:hover:text-slate-200"
          >
            Niveles
          </Link>
        </li>
        <li aria-hidden className="text-slate-400">
          ›
        </li>
        <li aria-current="page" className="font-semibold text-slate-900 dark:text-white">
          {code}
        </li>
      </ol>
    </nav>
  );
}

function LevelSwitcher({
  current,
  levels,
}: {
  current: string;
  levels: { code: string; title: string }[];
}) {
  const codes = levels.length ? levels.map((l) => l.code) : ([...LEVEL_CODES] as string[]);
  return (
    <div
      role="tablist"
      aria-label="Levels"
      className="flex flex-wrap gap-1.5 rounded-2xl border bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {codes.map((code) => {
        const active = code === current;
        return (
          <Link
            key={code}
            href={`/levels/${code}`}
            role="tab"
            aria-selected={active}
            className={
              active
                ? "rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm dark:bg-white dark:text-slate-900"
                : "rounded-xl px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            }
          >
            {code}
          </Link>
        );
      })}
    </div>
  );
}

export default async function LevelPage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "level" });

  let level: { title: string; description: string } | null = null;
  let units: UnitRow[] = [];
  let allLevels: { code: string; title: string; orderIndex: number }[] = [];

  try {
    allLevels = (await prisma.level.findMany({
      orderBy: { orderIndex: "asc" },
    })) as unknown as typeof allLevels;
  } catch {}

  // Fallback to static codes if DB empty
  if (allLevels.length === 0) {
    allLevels = LEVEL_CODES.map((c, i) => ({ code: c, title: c, orderIndex: i + 1 }));
  }

  try {
    const l = await prisma.level.findUnique({
      where: { code: code as never },
      include: { units: { orderBy: { orderIndex: "asc" } } },
    });
    if (l) {
      level = {
        title: (l as unknown as { title: string }).title,
        description: (l as unknown as { description: string }).description,
      };
      units = (l.units as unknown as UnitRow[]) ?? [];
    }
  } catch {}

  if (!level) {
    return (
      <div className="space-y-5">
        <Breadcrumbs code={code} locale={locale} />
        <LevelSwitcher current={code} levels={allLevels} />
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("notFound", { code })}</p>
          <NavigationToggle />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t("unit", { index: i + 1 })}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("placeholderUnit")}</p>
              <span className="mt-2 inline-block text-sm font-medium text-violet-600 dark:text-violet-300">
                {t("viewLessons")}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayTitle = getLevelTitle(code, locale, level.title);
  const displayDesc = getLevelDescription(code, locale, level.description);

  return (
    <div className="space-y-5">
      <Breadcrumbs code={code} locale={locale} />
      <LevelSwitcher current={code} levels={allLevels} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {displayTitle}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {displayDesc}
          </p>
        </div>
        <NavigationToggle />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {units.map((u) => {
          const title = getUnitTitle(u.title, locale);
          const desc = getUnitDescription(u.description, locale);
          return (
            <Link
              key={u.id}
              href={`/units/${u.id}`}
              className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              {u.coverImage ? (
                <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={u.coverImage}
                    alt={t("coverAlt", { title })}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 400px"
                    unoptimized={u.coverImage.includes("picsum.photos")}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-violet-50 to-slate-50 text-2xl dark:from-violet-950/30 dark:to-slate-900">
                  📚
                </div>
              )}
              <div className="p-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  <span className="mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">
                    {u.orderIndex}
                  </span>
                  {title}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {desc}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 group-hover:gap-1.5 group-hover:underline dark:text-violet-300">
                  {t("viewLessons")} <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* progressionMode note */}
      <p className="rounded-xl border border-dashed bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        Free mode: todos los niveles visibles. Si{" "}
        <code className="rounded bg-white px-1 py-0.5 dark:bg-slate-800">
          preferences.progressionMode === &quot;locked&quot;
        </code>{" "}
        se puede filtrar niveles bloqueados previo examen; por ahora se deja todo visible para no
        bloquear exploración.
      </p>
    </div>
  );
}
