"use client";
import { paywallMessage } from "../../lib/monetization/guard";

export function PaywallPlaceholder({ itemTitle, onClose }: { itemTitle: string; onClose?: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Premium paywall placeholder"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
        <h2 className="text-lg font-bold">Premium locked</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{paywallMessage(itemTitle)}</p>
        <p className="mt-2 text-xs text-gray-500">No payment is processed — this is a placeholder for future Stripe.</p>
        <div className="mt-4 flex justify-end gap-2">
          {onClose ? <button onClick={onClose} className="rounded border px-4 py-2 text-sm" aria-label="Close paywall dialog">Close</button> : null}
          <button disabled className="rounded bg-gray-300 px-4 py-2 text-sm text-gray-600" aria-disabled="true">Upgrade (soon)</button>
        </div>
      </div>
    </div>
  );
}
