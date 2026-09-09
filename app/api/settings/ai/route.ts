import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { prisma } from "../../../../lib/db";
import { encryptApiKey } from "../../../../lib/ai/encryption";

const VALID_PROVIDERS = new Set(["mock", "openrouter", "groq"]);

/**
 * Detects Prisma/ Postgres "table does not exist" errors.
 * Prisma code P2021 = Table does not exist.
 * Postgres 42P01 = undefined_table
 * Fallback string check covers Supabase pooler errors.
 */
function isMissingTableError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  if (code === "P2021") return true;
  const msg = String((e as { message?: string })?.message ?? e ?? "");
  if (msg.includes("42P01")) return true;
  if (msg.includes("does not exist") && msg.includes("user_ai_settings")) return true;
  if (msg.includes("The table") && msg.includes("does not exist")) return true;
  return false;
}

const MIGRATION_MSG = "Database migration pending. Run npx prisma migrate deploy";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      const settings = await prisma.userAiSettings.findUnique({ where: { userId } });
      if (!settings) {
        return NextResponse.json({ provider: "mock", model: null, enabled: false, hasKey: false });
      }
      return NextResponse.json({
        provider: settings.provider,
        model: settings.model,
        enabled: settings.enabled,
        hasKey: Boolean(settings.encryptedApiKey),
      });
    } catch (e) {
      if (isMissingTableError(e)) {
        console.warn(
          "[api/settings/ai] GET: user_ai_settings table missing, returning mock fallback",
          e,
        );
        return NextResponse.json(
          { provider: "mock", model: null, enabled: false, hasKey: false },
          { status: 200, headers: { "X-Migration-Pending": "1" } },
        );
      }
      throw e;
    }
  } catch (e) {
    if (isMissingTableError(e)) {
      console.warn("[api/settings/ai] GET outer: migration pending", e);
      return NextResponse.json(
        { provider: "mock", model: null, enabled: false, hasKey: false },
        { status: 200, headers: { "X-Migration-Pending": "1" } },
      );
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      provider?: string;
      apiKey?: string;
      model?: string | null;
      enabled?: boolean;
    };

    const provider = (body.provider ?? "mock").toLowerCase();
    if (!VALID_PROVIDERS.has(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Use mock|openrouter|groq" },
        { status: 400 },
      );
    }

    let encryptedApiKey: string | undefined = undefined;
    let hasKeyUpdate = false;
    if (typeof body.apiKey === "string" && body.apiKey.trim().length > 0) {
      encryptedApiKey = encryptApiKey(body.apiKey.trim());
      hasKeyUpdate = true;
    } else if (body.apiKey === "" || body.apiKey === null) {
      // explicit empty means keep existing? spec says leave empty to use mock → keep existing but not required.
      // We will not overwrite if empty string unless provider is mock
    }

    try {
      const existing = await prisma.userAiSettings.findUnique({ where: { userId } });

      const dataToSave: Record<string, unknown> = {
        provider,
        enabled: body.enabled ?? false,
      };
      if (body.model !== undefined) dataToSave.model = body.model || null;
      if (hasKeyUpdate && encryptedApiKey !== undefined)
        dataToSave.encryptedApiKey = encryptedApiKey;
      if (provider === "mock") {
        // keep key if user wants mock, but enabled false typically
      }

      if (existing) {
        const updated = await prisma.userAiSettings.update({
          where: { userId },
          data: dataToSave,
        });
        return NextResponse.json({
          provider: updated.provider,
          model: updated.model,
          enabled: updated.enabled,
          hasKey: Boolean(updated.encryptedApiKey),
        });
      } else {
        const createData: {
          userId: string;
          provider: string;
          encryptedApiKey: string | null;
          model: string | null;
          enabled: boolean;
        } = {
          userId,
          provider,
          encryptedApiKey: hasKeyUpdate && encryptedApiKey ? encryptedApiKey : null,
          model: body.model ? body.model : null,
          enabled: body.enabled ?? false,
        };
        const created = await prisma.userAiSettings.create({
          data: createData,
        });
        return NextResponse.json({
          provider: created.provider,
          model: created.model,
          enabled: created.enabled,
          hasKey: Boolean(created.encryptedApiKey),
        });
      }
    } catch (e) {
      if (isMissingTableError(e)) {
        console.warn("[api/settings/ai] POST: user_ai_settings table missing", e);
        return NextResponse.json(
          { error: MIGRATION_MSG, code: "MIGRATION_PENDING" },
          { status: 503, headers: { "X-Migration-Pending": "1" } },
        );
      }
      throw e;
    }
  } catch (e) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        { error: MIGRATION_MSG, code: "MIGRATION_PENDING" },
        { status: 503, headers: { "X-Migration-Pending": "1" } },
      );
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await prisma.userAiSettings.deleteMany({ where: { userId } });
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (isMissingTableError(e)) {
        console.warn("[api/settings/ai] DELETE: table missing, treating as ok", e);
        return NextResponse.json(
          { ok: true, migrationPending: true },
          { status: 200, headers: { "X-Migration-Pending": "1" } },
        );
      }
      throw e;
    }
  } catch (e) {
    if (isMissingTableError(e)) {
      return NextResponse.json(
        { ok: true, migrationPending: true },
        { status: 200, headers: { "X-Migration-Pending": "1" } },
      );
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
