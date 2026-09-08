import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { prisma } from "../../../../lib/db";
import { encryptApiKey } from "../../../../lib/ai/encryption";

const VALID_PROVIDERS = new Set(["mock", "openrouter", "groq"]);

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const existing = await prisma.userAiSettings.findUnique({ where: { userId } });

    const dataToSave: Record<string, unknown> = {
      provider,
      enabled: body.enabled ?? false,
    };
    if (body.model !== undefined) dataToSave.model = body.model || null;
    if (hasKeyUpdate && encryptedApiKey !== undefined) dataToSave.encryptedApiKey = encryptedApiKey;
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
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await prisma.userAiSettings.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
