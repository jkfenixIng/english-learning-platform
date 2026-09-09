"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error] fatal", error);
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
    <html lang="en">
      <body className="bg-background flex min-h-screen items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h2 className="text-xl font-semibold">Application error</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {error.message || "Unexpected error"}
          </p>
          <button
            onClick={() => reset()}
            className="bg-primary text-primary-foreground mt-6 rounded-md px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
