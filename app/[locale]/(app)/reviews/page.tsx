import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../lib/db";
import { createClient } from "../../../../lib/supabase/server";
import { SRSGuide } from "../../../../components/srs/SRSGuide";
import { ReviewActions } from "../../../../components/srs/ReviewActions";
import { CreateDemoCardsButton } from "../../../../components/srs/CreateDemoCardsButton";

type CardRow = {
  id: string;
  dueDate: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  exercise: {
    type: string;
    prompt: unknown;
    lesson?: { unitId: string } | null;
  };
};

export default async function ReviewsPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ unitId?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  const { unitId } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  // Auth — real user, no dummy fallback
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {
    // supabase misconfigured — treat as unauthenticated
  }

  if (!userId) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t("needLoginTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {t("needLoginDesc")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/login`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t("loginCta")}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("registerCta")}
            </Link>
          </div>
        </div>
        <SRSGuide locale={locale} />
      </div>
    );
  }

  // SRS opt-in check
  let srsEnabled = true;
  try {
    const pref = await prisma.userPreferences.findUnique({ where: { userId } });
    if (pref && (pref as unknown as { srsEnabled: boolean }).srsEnabled === false)
      srsEnabled = false;
  } catch {
    srsEnabled = true;
  }

  if (!srsEnabled) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t("srsDisabledTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("srsDisabledDesc")}</p>
          <div className="mt-3 rounded-lg border bg-indigo-50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/30">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
              {t("srsDisabledWhat")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-indigo-700 dark:text-indigo-300">
              {t("srsDisabledWhatDesc")}
            </p>
          </div>
          <Link
            href={`/${locale}/settings`}
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t("goToSettings")}
          </Link>
        </div>
        <SRSGuide locale={locale} />
      </div>
    );
  }

  let dueCards: CardRow[] = [];
  let totalCount = 0;
  let newCount = 0;

  try {
    // total for this user
    totalCount = await prisma.srsCard.count({ where: { userId } as never }).catch(() => 0);
    newCount = await prisma.srsCard
      .count({ where: { userId, repetitions: 0 } as never })
      .catch(() => 0);

    const whereDue: Record<string, unknown> = { userId, dueDate: { lte: new Date(today) } };
    const raw = (await prisma.srsCard.findMany({
      where: whereDue as never,
      include: { exercise: { include: { lesson: true } } },
      take: 20,
      orderBy: { dueDate: "asc" },
    })) as unknown as CardRow[];

    let filtered = raw;
    if (unitId) {
      filtered = filtered.filter(
        (c) =>
          (c.exercise as unknown as { lesson?: { unitId: string } })?.lesson?.unitId === unitId,
      );
    }
    dueCards = filtered;
  } catch {
    dueCards = [];
  }

  const dueCount = dueCards.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t("dailyReviews")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("dueToday", { today, count: dueCount })}
          </p>
          {unitId && (
            <p className="text-xs text-slate-500">
              {t("filteredByUnit", { unitId })}{" "}
              <Link href={`/${locale}/reviews`} className="text-indigo-600 dark:text-indigo-400">
                {t("clear")}
              </Link>
            </p>
          )}
        </div>

        {/* Progress pill */}
        <div className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {t("statsDue", { count: dueCount })}
            </span>
            <span className="text-slate-400">·</span>
            <span>{t("statsTotal", { count: totalCount })}</span>
            <span className="text-slate-400">·</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
              {t("statsNew", { count: newCount })}
            </span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="rounded-xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t("statsTitle")}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {t("statsDue", { count: dueCount })} / {t("statsTotal", { count: totalCount })}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${totalCount ? Math.round((dueCount / totalCount) * 100) : 0}%` }}
              role="progressbar"
              aria-valuenow={totalCount ? Math.round((dueCount / totalCount) * 100) : 0}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* How it works — always visible */}
      <SRSGuide locale={locale} />

      <div className="grid gap-3">
        {dueCards.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("emptyTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("emptyDesc")}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("step1")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {t("step1Desc")}
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("step2")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {t("step2Desc")}
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t("step3")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {t("step3Desc")}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                {t("example")}
              </p>
            </div>

            <CreateDemoCardsButton locale={locale} />

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Link
                href={`/${locale}/levels`}
                className="rounded-lg border px-3 py-1.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Levels →
              </Link>
              <Link href={`/${locale}/settings`} className="text-indigo-600 dark:text-indigo-400">
                {t("goToSettings")}
              </Link>
            </div>
          </div>
        ) : (
          dueCards.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {c.exercise.type}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {t("due", { date: new Date(c.dueDate).toISOString().slice(0, 10) })}
                </span>
                {c.repetitions === 0 && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {t("newBadge")}
                  </span>
                )}
                <span className="ml-auto flex gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{t("intervalLabel", { days: c.interval })}</span>
                  <span>{t("easeLabel", { value: c.easeFactor.toFixed(2) })}</span>
                  <span>{t("repetitionsLabel", { count: c.repetitions })}</span>
                </span>
              </div>
              <pre className="mt-2 max-w-full overflow-auto rounded bg-slate-50 p-2 text-xs dark:bg-slate-800 dark:text-slate-200">
                {JSON.stringify(c.exercise.prompt, null, 2).slice(0, 400)}
              </pre>
              <ReviewActions
                cardId={c.id}
                locale={locale}
                cardState={{
                  interval: c.interval,
                  easeFactor: c.easeFactor,
                  repetitions: c.repetitions,
                }}
              />
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200">
        {t("manualHint")}
      </div>
    </div>
  );
}
