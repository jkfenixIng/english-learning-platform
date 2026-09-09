"use client";

import { useState } from "react";

type Props = {
  challengeId: string;
  locale: string;
  initialJoined?: boolean;
  initialCompleted?: boolean;
  labels: {
    join: string;
    joining: string;
    joined: string;
    unauthorized: string;
    alreadyEnrolled: string;
    disabled: string;
    genericError: string;
    leave?: string;
    leaving?: string;
    leaveConfirm?: string;
    notEnrolled?: string;
    alreadyCompleted?: string;
    completed?: string;
  };
};

export default function ChallengeJoinButton({
  challengeId,
  initialJoined,
  initialCompleted,
  labels,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "joined" | "error" | "leaving">(
    initialCompleted ? "joined" : initialJoined ? "joined" : "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const isCompleted = initialCompleted;

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
        setMessage(labels.joined);
        return;
      }
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

  async function handleLeave() {
    const confirmMsg = labels.leaveConfirm ?? "Leave this challenge?";
    if (typeof window !== "undefined" && !window.confirm(confirmMsg)) return;
    setStatus("leaving");
    setMessage(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/leave`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("idle");
        setMessage(null);
        return;
      }
      if (res.status === 401) {
        setStatus("error");
        setMessage(data.error ?? labels.unauthorized);
        return;
      }
      if (res.status === 404) {
        setStatus("idle");
        setMessage(data.error ?? labels.notEnrolled ?? labels.genericError);
        return;
      }
      if (res.status === 409) {
        setStatus("joined");
        setMessage(data.error ?? labels.alreadyCompleted ?? labels.genericError);
        return;
      }
      setStatus("error");
      setMessage(data.error ?? labels.genericError);
    } catch {
      setStatus("error");
      setMessage(labels.genericError);
    }
  }

  if (status === "joined" || isCompleted) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {isCompleted ? (labels.completed ?? labels.joined) : labels.joined}
        </span>
        {message && message !== labels.joined && (
          <span className="text-xs text-gray-500">{message}</span>
        )}
        {!isCompleted && (
          <button
            onClick={handleLeave}
            className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            aria-label={labels.leave ?? "Leave"}
          >
            {labels.leave ?? "Leave"}
          </button>
        )}
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

  // leaving state shows disabled leave button + spinner text
  if (status === "leaving") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          disabled
          className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-400 dark:border-gray-700"
        >
          {labels.leaving ?? "Leaving…"}
        </button>
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
