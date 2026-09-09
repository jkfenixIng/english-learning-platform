"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error] unhandled", error);
    // Optional Sentry free — no hard dep, hidden from webpack via Function eval
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        Function('return import("@sentry/nextjs")')()
          .then((Sentry: { captureException: (e: unknown) => void }) =>
            Sentry.captureException(error),
          )
          .catch(() => {});
      } catch {}
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl p-8 text-center">
      <h2 className="text-foreground text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mt-2 text-sm">{error.message || "Unexpected error"}</p>
      {error.digest && <p className="text-muted-foreground mt-1 text-xs">Digest: {error.digest}</p>}
      <button
        onClick={() => reset()}
        className="bg-primary text-primary-foreground hover:bg-primary-600 mt-6 rounded-md px-4 py-2 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
