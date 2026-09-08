import Link from "next/link";

export default function MarketingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-16 text-white">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          English Learning Platform
        </h1>
        <p className="mt-4 text-lg text-indigo-100">
          Learn English from A1 to C2 — at your own pace. All 6 CEFR levels, AI tutor, speaking
          practice, and gamification.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-white px-8 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white px-8 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Log In
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {["A1-A2 Core", "13 Exercise Types", "AI Tutor", "PWA Ready"].map((f) => (
            <div key={f} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
              {f}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
