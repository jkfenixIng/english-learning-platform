import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "../../../../../lib/db";
import { NavigationToggle } from "../../../../../components/cefr/NavigationToggle";

export default async function LevelPage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code, locale } = await params;
  const t = await getTranslations({ locale, namespace: "level" });
  let level: { title: string; description: string } | null = null;
  let units: {
    id: string;
    title: string;
    description: string;
    orderIndex: number;
    coverImage: string | null;
  }[] = [];
  try {
    const l = await prisma.level.findUnique({
      where: { code: code as never },
      include: { units: { orderBy: { orderIndex: "asc" } } },
    });
    if (l) {
      level = l;
      units = l.units as unknown as typeof units;
    }
  } catch {}

  if (!level) {
    return (
      <div className="space-y-4">
        <NavigationToggle />
        <p className="text-sm text-gray-500">{t("notFound", { code })}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded border bg-white p-4 dark:bg-gray-900">
              <p className="font-medium">{t("unit", { index: i + 1 })}</p>
              <p className="text-sm text-gray-500">{t("placeholderUnit")}</p>
              <Link href="#" className="text-sm text-indigo-600">
                {t("viewLessons")}
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{level.title}</h1>
        <NavigationToggle />
      </div>
      <p className="text-sm text-gray-600">{level.description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {units.map((u) => (
          <Link
            key={u.id}
            href={`/units/${u.id}`}
            className="group overflow-hidden rounded-xl border bg-white hover:shadow dark:border-gray-800 dark:bg-gray-900"
          >
            {u.coverImage ? (
              <div className="relative aspect-[16/9] w-full bg-gray-100 dark:bg-gray-800">
                <Image
                  src={u.coverImage}
                  alt={t("coverAlt", { title: u.title })}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </div>
            ) : null}
            <div className="p-4">
              <p className="font-medium">
                {u.orderIndex}. {u.title}
              </p>
              <p className="text-sm text-gray-500">{u.description}</p>
              <span className="mt-2 inline-block text-xs font-medium text-indigo-600 group-hover:underline dark:text-indigo-400">
                {t("viewLessons")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
