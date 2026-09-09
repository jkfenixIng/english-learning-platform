import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";
import { prisma } from "../../../../lib/db";

function isConnectionError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: string; message?: string };
  if (err.code === "P1001" || err.code === "P1002" || err.code === "P1008") return true;
  const msg = String(err.message ?? "").toLowerCase();
  return (
    msg.includes("can't reach database server") ||
    msg.includes("can't reach database") ||
    msg.includes("p1001") ||
    msg.includes("connection terminated") ||
    msg.includes("econnrefused") ||
    (msg.includes("connection") && msg.includes("timeout"))
  );
}

export async function POST() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes("not available")) {
    return NextResponse.json(
      { message: "Seed skipped — no DATABASE_URL (idempotent check passed)", count: 0 },
      { status: 200 },
    );
  }

  try {
    // Try to run the full seed via child process (idempotent upsert). This is the
    // canonical path — prisma/seed.ts handles all 6 CEFR levels, badges, shop, etc.
    // We use spawnSync with timeout to avoid hanging the route.
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      timeout: 120_000,
      encoding: "utf-8",
      env: process.env,
      cwd: process.cwd(),
    });

    // Log for observability — previously this was a silent stub
    if (result.stdout) console.log("[admin/seed] stdout:", result.stdout.slice(0, 2000));
    if (result.stderr) console.error("[admin/seed] stderr:", result.stderr.slice(0, 2000));
    if (result.error) {
      console.error("[admin/seed] spawn error:", result.error);
      throw result.error;
    }

    // Non-zero exit: could be P1001 or validation error — surface it
    if (result.status !== 0) {
      const stderr = String(result.stderr ?? "");
      const stdout = String(result.stdout ?? "");
      const combined = `${stderr}\n${stdout}`;
      // Detect connection error to return 503 with i18n-friendly payload
      if (
        combined.toLowerCase().includes("p1001") ||
        combined.toLowerCase().includes("can't reach database") ||
        combined.toLowerCase().includes("connection terminated")
      ) {
        return NextResponse.json(
          {
            error: "Database unavailable — check DATABASE_URL and network (P1001)",
            code: "P1001",
            details: combined.slice(0, 1000),
          },
          { status: 503 },
        );
      }
      // If counts already exist, treat as idempotent success even if seed warned
      try {
        const [levels, units, lessons, exercises] = await Promise.all([
          prisma.level.count(),
          prisma.unit.count(),
          prisma.lesson.count(),
          prisma.exercise.count(),
        ]);
        if (levels > 0) {
          return NextResponse.json({
            message: "Seed completed with warnings (idempotent check passed)",
            counts: { levels, units, lessons, exercises },
            warnings: combined.slice(0, 1000),
          });
        }
      } catch {}
      return NextResponse.json(
        { error: "Seed failed", details: combined.slice(0, 2000), status: result.status },
        { status: 500 },
      );
    }

    // Verify counts after successful seed
    try {
      const [levels, units, lessons, exercises] = await Promise.all([
        prisma.level.count(),
        prisma.unit.count(),
        prisma.lesson.count(),
        prisma.exercise.count(),
      ]);
      return NextResponse.json({
        message: "Seed executed successfully (idempotent upsert)",
        counts: { levels, units, lessons, exercises },
      });
    } catch (countErr) {
      console.error("[admin/seed] count verification failed", countErr);
      if (isConnectionError(countErr)) {
        return NextResponse.json(
          { error: "Database unavailable after seed (P1001)", code: "P1001" },
          { status: 503 },
        );
      }
      return NextResponse.json({
        message: "Seed executed — count verification skipped",
        details: String(countErr).slice(0, 500),
      });
    }
  } catch (e) {
    console.error("[admin/seed] unexpected error", e);
    if (isConnectionError(e)) {
      return NextResponse.json(
        {
          error: "Database unavailable — check DATABASE_URL and network (P1001)",
          code: "P1001",
          details: String((e as Error).message).slice(0, 500),
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: String(e), details: String(e).slice(0, 1000) },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Allow admin to check counts without seeding — useful for empty-DB CTA
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const [levels, units, lessons, exercises] = await Promise.all([
      prisma.level.count(),
      prisma.unit.count(),
      prisma.lesson.count(),
      prisma.exercise.count(),
    ]);
    return NextResponse.json({
      counts: { levels, units, lessons, exercises },
      empty: levels === 0,
    });
  } catch (e) {
    console.error("[admin/seed GET] count failed", e);
    if (isConnectionError(e)) {
      return NextResponse.json(
        { error: "Database unavailable (P1001)", code: "P1001" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
