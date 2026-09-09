import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function MarketingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-700 px-6 py-16 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-transparent to-violet-600/20"
      />
      <div className="relative z-10 max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 text-lg text-indigo-100">{t("subtitle")}</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-white px-8 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            {t("getStarted")}
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white px-8 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            {t("logIn")}
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {[
            t("features.core"),
            t("features.exerciseTypes"),
            t("features.aiTutor"),
            t("features.pwaReady"),
          ].map((f) => (
            <div key={f} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
              {f}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
