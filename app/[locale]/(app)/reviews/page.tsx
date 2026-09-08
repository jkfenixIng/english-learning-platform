import Link from "next/link";
import { prisma } from "../../../../lib/db";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string }>;
}) {
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
        <h1 className="font-bold">Reviews</h1>
        <p className="mt-2 text-sm text-gray-500">
          SRS disabled — enable in Settings to see daily reviews.
        </p>
      </div>
    );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Daily Reviews</h1>
      <p className="text-sm text-gray-500">
        Due today ({today}): {cards.length} cards · Optional per preferences
      </p>
      {unitId && (
        <p className="text-xs">
          Filtered by unit {unitId}{" "}
          <Link href="/reviews" className="text-indigo-600">
            clear
          </Link>
        </p>
      )}
      <div className="grid gap-3">
        {cards.length === 0 ? (
          <p className="rounded-xl border bg-white p-4 text-sm text-gray-500 dark:bg-gray-900">
            No cards due. Complete flashcard or vocab exercises to build your queue.
          </p>
        ) : (
          cards.map((c) => (
            <div key={c.id} className="rounded-xl border bg-white p-4 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {c.exercise.type} · due {new Date(c.dueDate).toISOString().slice(0, 10)}
              </p>
              <pre className="mt-2 max-w-full overflow-auto text-sm">
                {JSON.stringify(c.exercise.prompt, null, 2).slice(0, 300)}
              </pre>
              <ReviewActions cardId={c.id} />
            </div>
          ))
        )}
      </div>
      <div className="rounded-xl border bg-indigo-50 p-3 text-xs dark:bg-indigo-950/30">
        Manual topic review: add ?unitId=... to filter by unit.
      </div>
    </div>
  );
}

function ReviewActions({ cardId }: { cardId: string }) {
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
      <span className="text-xs text-gray-400">Quality 0-5 (SM-2) — 3+ is pass, &lt;3 resets</span>
    </div>
  );
}
