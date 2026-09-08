import { NextRequest, NextResponse } from "next/server";
import { ProviderRouter } from "../../../../lib/ai/router";

export async function POST(req: NextRequest) {
  const spec = await req.json() as { type: string; level: string; topic: string };
  const router = new ProviderRouter();
  try {
    const result = await router.generateExercise(spec);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
