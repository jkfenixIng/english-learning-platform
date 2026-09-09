"use client";
import { useTranslations } from "next-intl";

export function PaywallPlaceholder({
  itemTitle,
  onClose,
}: {
  itemTitle: string;
  onClose?: () => void;
}) {
  const t = useTranslations("paywall");
  const message = t("premiumMessage", { title: itemTitle });
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("dialogLabel")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <p className="mt-2 text-xs text-gray-500">{t("placeholderNote")}</p>
        <div className="mt-4 flex justify-end gap-2">
          {onClose ? (
            <button
              onClick={onClose}
              className="rounded border px-4 py-2 text-sm"
              aria-label={t("close")}
            >
              {t("close")}
            </button>
          ) : null}
          <button
            disabled
            className="rounded bg-gray-300 px-4 py-2 text-sm text-gray-600"
            aria-disabled="true"
          >
            {t("upgradeSoonButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
