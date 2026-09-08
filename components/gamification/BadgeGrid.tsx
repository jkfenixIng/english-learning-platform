export function BadgeGrid({ badges }: { badges: { code: string; title: string; icon: string; earnedAt?: string }[] }) {
  if (badges.length === 0) return <p className="text-sm text-gray-500">No badges yet — keep learning!</p>;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {badges.map((b) => (
        <div key={b.code} className="rounded-xl border bg-white p-3 text-center dark:bg-gray-900">
          <div className="text-2xl">{b.icon}</div>
          <p className="mt-1 text-xs font-medium">{b.title}</p>
        </div>
      ))}
    </div>
  );
}
