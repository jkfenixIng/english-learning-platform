export function StreakIndicator({ streak }: { streak: number }) {
  return <div className="flex items-center gap-1 text-sm font-semibold"><span>🔥</span><span>{streak} day streak</span></div>;
}
