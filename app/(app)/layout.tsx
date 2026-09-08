import Link from "next/link";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { OfflineBanner } from "../../components/pwa/OfflineBanner";
import { TutorWidget } from "../../components/tutor/TutorWidget";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <OfflineBanner />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 dark:bg-gray-900">
        <Link href="/dashboard" className="font-bold text-indigo-600">ELP</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/levels/A1">Levels</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/tutor">Tutor</Link>
          <Link href="/settings">Settings</Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <TutorWidget />
    </div>
  );
}
