import { NextRequest, NextResponse } from "next/server";
import { ProviderRouter } from "../../../../lib/ai/router";

export async function POST(req: NextRequest) {
  const { prompt, text } = await req.json() as { prompt: string; text: string };
  const router = new ProviderRouter();
  try {
    const result = await router.correctWriting(prompt, text);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ score: 60, feedback: "AI unavailable — heuristic applied", corrections: [], error: String(e) });
  }
}
