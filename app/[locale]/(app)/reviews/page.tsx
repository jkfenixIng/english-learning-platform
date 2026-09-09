import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../lib/db";

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
  let cards: { id: string; dueDate: Date; exercise: { type: string; prompt: unknown } }[] = [];
  let srsEnabled = true;
  try {
    // default demo user; real auth will supply userId
    const dummyId = "00000000-0000-0000-0000-000000000000";
    const pref = await prisma.userPreferences.findUnique({ where: { userId: dummyId } });
    if (pref && (pref as unknown as { srsEnabled: boolean }).srsEnabled === false)
      srsEnabled = false;
    if (srsEnabled) {
      cards = (await prisma.srsCard.findMany({
        where: { dueDate: { lte: new Date(today) } },
        include: { exercise: true },
        take: 20,
        orderBy: { dueDate: "asc" },
      })) as never;
      if (unitId)
        cards = cards.filter(
          (c) =>
            (c as unknown as { exercise: { lesson: { unitId: string } } }).exercise.lesson
              ?.unitId === unitId,
        );
    }
  } catch {
    srsEnabled = true;
  }
  if (!srsEnabled)
    return (
      <div className="rounded-xl border bg-white p-6 dark:bg-gray-900">
        <h1 className="font-bold">{t("srsDisabledTitle")}</h1>
        <p className="mt-2 text-sm text-gray-500">{t("srsDisabledDesc")}</p>
      </div>
    );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("dailyReviews")}</h1>
      <p className="text-sm text-gray-500">{t("dueToday", { today, count: cards.length })}</p>
      {unitId && (
        <p className="text-xs">
          {t("filteredByUnit", { unitId })}{" "}
          <Link href="/reviews" className="text-indigo-600">
            {t("clear")}
          </Link>
        </p>
      )}
      <div className="grid gap-3">
        {cards.length === 0 ? (
          <p className="rounded-xl border bg-white p-4 text-sm text-gray-500 dark:bg-gray-900">
            {t("noCards")}
          </p>
        ) : (
          cards.map((c) => (
            <div key={c.id} className="rounded-xl border bg-white p-4 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {c.exercise.type} ·{" "}
                {t("due", { date: new Date(c.dueDate).toISOString().slice(0, 10) })}
              </p>
              <pre className="mt-2 max-w-full overflow-auto text-sm">
                {JSON.stringify(c.exercise.prompt, null, 2).slice(0, 300)}
              </pre>
              <ReviewActions cardId={c.id} locale={locale} />
            </div>
          ))
        )}
      </div>
      <div className="rounded-xl border bg-indigo-50 p-3 text-xs dark:bg-indigo-950/30">
        {t("manualHint")}
      </div>
    </div>
  );
}

async function ReviewActions({ cardId, locale }: { cardId: string; locale: string }) {
  const t = await getTranslations({ locale, namespace: "reviews" });
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {[0, 2, 3, 4, 5].map((q) => (
        <form key={q} action={`/api/srs/review`} method="post">
          <button name="quality" value={String(q)} className="rounded border px-2 py-1 text-xs">
            Q{q}
          </button>
          <input type="hidden" name="cardId" value={cardId} />
        </form>
      ))}
      <span className="text-xs text-gray-400">{t("qualityHint")}</span>
    </div>
  );
}
