import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminGuide } from "@/components/admin/AdminGuide";

async function getStats() {
  try {
    const [lessons, exercises, shopItems, users, levels] = await Promise.all([
      prisma.lesson.count().catch(() => 0),
      prisma.exercise.count().catch(() => 0),
      prisma.shopItem.count().catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.level.count().catch(() => 0),
    ]);
    return { lessons, exercises, shopItems, users, levels };
  } catch {
    return { lessons: 0, exercises: 0, shopItems: 0, users: 0, levels: 0 };
  }
}

const CARDS = [
  {
    href: "/admin/lessons",
    title: "Lecciones",
    desc: "Crear y editar contenido visual",
    icon: "📚",
    color: "from-indigo-500 to-violet-500",
    statKey: "lessons" as const,
    cta: "Crear lección",
    ctaHref: "/admin/lessons?new=1",
  },
  {
    href: "/admin/exercises",
    title: "Pruebas / Ejercicios",
    desc: "13 tipos sin JSON",
    icon: "🧩",
    color: "from-emerald-500 to-teal-500",
    statKey: "exercises" as const,
    cta: "Crear prueba",
    ctaHref: "/admin/exercises?new=1",
  },
  {
    href: "/admin/shop",
    title: "Tienda",
    desc: "Items y premium",
    icon: "🛍️",
    color: "from-amber-500 to-orange-500",
    statKey: "shopItems" as const,
    cta: "Ver tienda",
    ctaHref: "/admin/shop",
  },
  {
    href: "/admin/users",
    title: "Usuarios",
    desc: "PII solo lectura",
    icon: "👥",
    color: "from-sky-500 to-blue-500",
    statKey: "users" as const,
    cta: "Ver usuarios",
    ctaHref: "/admin/users",
  },
];

export default async function AdminOverviewPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Panel de administración
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Gestiona tu catálogo sin código. Todo es visual, guiado y con preview en vivo.
        </p>
      </div>

      <AdminGuide />

      {/* Stats + CTA */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div
            key={c.href}
            className="group shadow-card hover:shadow-card-hover relative overflow-hidden rounded-2xl border bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.color}`}
              aria-hidden
            />
            <div className="flex items-start justify-between">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800"
                aria-hidden
              >
                {c.icon}
              </span>
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {stats[c.statKey]} total
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{c.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{c.desc}</p>
            <div className="mt-4 flex gap-2">
              <Link
                href={c.ctaHref}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {c.cta} →
              </Link>
              <Link
                href={c.href}
                className="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Ver lista
              </Link>
            </div>
            <Link href={c.href} className="absolute inset-0" aria-label={`Ir a ${c.title}`}>
              <span className="sr-only">Ir a {c.title}</span>
            </Link>
          </div>
        ))}
      </div>

      {/* Secondary nav */}
      <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">Accesos rápidos</h2>
        <p className="mt-1 text-xs text-slate-500">
          Niveles, unidades, desafíos, insignias y herramientas de seed — todo admin-only.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-3">
          {[
            {
              href: "/admin/levels",
              label: "Levels / Niveles",
              sub: "CRUD con upsert",
              icon: "🎯",
            },
            { href: "/admin/units", label: "Units / Unidades", sub: "20 por nivel", icon: "📦" },
            { href: "/admin/challenges", label: "Challenges", sub: "Recompensas XP", icon: "🏆" },
            { href: "/admin/badges", label: "Badges / Certificados", sub: "Logros", icon: "🎖️" },
            {
              href: "/admin/seed",
              label: "Seed (idempotente)",
              sub: "Poblar catálogo",
              icon: "🌱",
            },
            { href: "/dashboard", label: "← Volver a la app", sub: "Vista estudiante", icon: "↩️" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 rounded-xl border px-3 py-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <span className="text-lg" aria-hidden>
                {l.icon}
              </span>
              <span>
                <span className="block text-sm font-medium">{l.label}</span>
                <span className="text-xs text-slate-500">{l.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400">
        Tip: usa la guía de arriba para tu primera lección. Los botones <em>Crear lección</em> y{" "}
        <em>Crear prueba</em> te llevan directo al editor guiado paso a paso.
      </p>
    </div>
  );
}
