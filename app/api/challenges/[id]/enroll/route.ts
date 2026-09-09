import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { enrollChallenge } from "../../../../../lib/challenges/service";
import { ensureUserFromSupabase } from "../../../../../lib/auth/ensureUser";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 });
  }

  try {
    await ensureUserFromSupabase(user);
  } catch {
    return NextResponse.json(
      { error: "User not synchronized — please sign in again" },
      { status: 401 },
    );
  }
  const userId = user.id;

  try {
    const participant = await enrollChallenge(id, userId);
    return NextResponse.json({ participant });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    if (raw.includes("not synchronized")) {
      return NextResponse.json(
        { error: "User not synchronized — please sign in again" },
        { status: 401 },
      );
    }
    if (raw.includes("not found")) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }
    if (raw.includes("not active")) {
      return NextResponse.json({ error: "Challenge not active" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to join challenge. Please try again." },
      { status: 500 },
    );
  }
}
