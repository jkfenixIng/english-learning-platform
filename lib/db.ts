import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Optional error wrapper — centralizes DB error logging without extra deps.
// Use prisma directly; this helper is for explicit try/catch sites that want free tracking.
export async function withDbError<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[db:${op}]`, e);
    if (process.env.SENTRY_DSN) {
      try {
        Function('return import("@sentry/nextjs")')()
          .then((S: { captureException: (err: unknown) => void }) => S.captureException(e))
          .catch(() => {});
      } catch {}
    }
    throw e;
  }
}
