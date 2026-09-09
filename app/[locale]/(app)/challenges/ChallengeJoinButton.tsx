"use client";

import { useState } from "react";

type Props = {
  challengeId: string;
  locale: string;
  labels: {
    join: string;
    joining: string;
    joined: string;
    unauthorized: string;
    alreadyEnrolled: string;
    disabled: string;
    genericError: string;
  };
};

export default function ChallengeJoinButton({ challengeId, labels }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "joined" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleJoin() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("joined");
        setMessage(labels.alreadyEnrolled ? labels.joined : labels.joined);
        return;
      }
      // Map error codes to friendly messages
      if (res.status === 401) {
        setStatus("error");
        setMessage(data.error ?? labels.unauthorized);
        return;
      }
      if (res.status === 403) {
        setStatus("error");
        setMessage(data.error ?? labels.disabled);
        return;
      }
      if (res.status === 409) {
        setStatus("joined");
        setMessage(labels.alreadyEnrolled);
        return;
      }
      setStatus("error");
      setMessage(data.error ?? labels.genericError);
    } catch {
      setStatus("error");
      setMessage(labels.genericError);
    }
  }

  if (status === "joined") {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {labels.joined}
        </span>
        {message && message !== labels.joined && (
          <span className="text-xs text-gray-500">{message}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleJoin}
        disabled={status === "loading"}
        className="bg-primary rounded px-3 py-1 text-xs text-white disabled:opacity-50"
        aria-label={labels.join}
      >
        {status === "loading" ? labels.joining : labels.join}
      </button>
      {status === "error" && message && (
        <span
          role="alert"
          className="max-w-[180px] text-right text-xs text-red-600 dark:text-red-400"
        >
          {message}
        </span>
      )}
    </div>
  );
}
