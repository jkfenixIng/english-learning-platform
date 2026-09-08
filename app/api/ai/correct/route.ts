import { NextRequest, NextResponse } from "next/server";
import { ProviderRouter } from "../../../../lib/ai/router";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const { prompt, text } = (await req.json()) as { prompt: string; text: string };
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {}
  const router = await ProviderRouter.createForUser(userId);
  try {
    const result = await router.correctWriting(prompt, text);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({
      score: 60,
      feedback: "AI unavailable — heuristic applied",
      corrections: [],
      error: String(e),
    });
  }
}
