import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../lib/db";
import ChallengeJoinButton from "./ChallengeJoinButton";

export default async function ChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "challengesPage" });
  let challenges: {
    id: string;
    title: string;
    description: string;
    type: string;
    rewardXp: number;
    startAt: Date;
    endAt: Date;
  }[] = [];
  try {
    challenges = (await prisma.challenge.findMany({ orderBy: { startAt: "desc" } })) as never;
  } catch {}
  if (!challenges.length)
    challenges = [
      {
        id: "1",
        title: t("fallbackDailyTitle"),
        description: t("fallbackDailyDesc"),
        type: "daily",
        rewardXp: 30,
        startAt: new Date(),
        endAt: new Date(Date.now() + 86400000),
      },
      {
        id: "2",
        title: t("fallbackWeeklyTitle"),
        description: t("fallbackWeeklyDesc"),
        type: "weekly",
        rewardXp: 120,
        startAt: new Date(),
        endAt: new Date(Date.now() + 7 * 86400000),
      },
    ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-sm text-gray-500">{t("subtitle")}</p>
      <div className="grid gap-3">
        {challenges.map((c) => (
          <div key={c.id} className="rounded-xl border bg-white p-4 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-indigo-600 uppercase">{c.type}</p>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-gray-500">{c.description}</p>
                <p className="mt-1 text-xs">{t("reward", { xp: c.rewardXp })}</p>
              </div>
              <ChallengeJoinButton
                challengeId={c.id}
                locale={locale}
                labels={{
                  join: t("join"),
                  joining: t("joining"),
                  joined: t("joined"),
                  unauthorized: t("joinUnauthorized"),
                  alreadyEnrolled: t("alreadyEnrolled"),
                  disabled: t("disabled"),
                  genericError: t("genericError"),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
