import { NextRequest, NextResponse } from "next/server";
import { ProviderRouter } from "../../../../lib/ai/router";

export async function POST(req: NextRequest) {
  const body = await req.json() as { messages: { role: "user" | "assistant" | "system"; content: string }[] };
  const router = new ProviderRouter();
  try {
    const reply = await router.chat(body.messages);
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ reply: "Tutor unavailable", error: String(e) }, { status: 200 });
  }
}
