"use client";
import { useOnlineStatus } from "../../lib/hooks/useOnlineStatus";
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="bg-amber-500 px-4 py-2 text-center text-sm text-white" role="status" aria-live="polite">
      You are offline — reviews remain available (queued sync when back online)
    </div>
  );
}
