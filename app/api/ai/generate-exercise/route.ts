import { NextRequest, NextResponse } from "next/server";
import { ProviderRouter } from "../../../../lib/ai/router";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const spec = (await req.json()) as { type: string; level: string; topic: string };
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {}
  const router = await ProviderRouter.createForUser(userId);
  try {
    const result = await router.generateExercise(spec);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
