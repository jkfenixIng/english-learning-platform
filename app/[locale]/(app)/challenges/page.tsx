import { prisma } from "../../../../lib/db";

export default async function ChallengesPage() {
  let challenges: { id: string; title: string; description: string; type: string; rewardXp: number; startAt: Date; endAt: Date }[] = [];
  try { challenges = await prisma.challenge.findMany({ orderBy: { startAt: "desc" } }) as never; } catch {}
  if (!challenges.length) challenges = [
    { id: "1", title: "Daily Sprint — Complete 5 exercises", description: "Complete 5 exercises today", type: "daily", rewardXp: 30, startAt: new Date(), endAt: new Date(Date.now()+86400000) },
    { id: "2", title: "Weekly Marathon — 25 exercises", description: "Complete 25 exercises this week", type: "weekly", rewardXp: 120, startAt: new Date(), endAt: new Date(Date.now()+7*86400000) },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Challenges</h1>
      <p className="text-sm text-gray-500">Daily, weekly, timed, streak and competitive — opt-in via Settings</p>
      <div className="grid gap-3">
        {challenges.map((c) => (
          <div key={c.id} className="rounded-xl border bg-white p-4 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-indigo-600">{c.type}</p>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-gray-500">{c.description}</p>
                <p className="mt-1 text-xs">Reward: {c.rewardXp} XP</p>
              </div>
              <ChallengeJoinButton id={c.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChallengeJoinButton({ id }: { id: string }) {
  return <form action={`/api/challenges/${id}/join`} method="post"><button formAction={`/api/challenges/${id}/join`} className="rounded bg-indigo-600 px-3 py-1 text-xs text-white">Join</button></form>;
}
