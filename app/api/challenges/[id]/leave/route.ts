import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { leaveChallenge } from "../../../../../lib/challenges/service";
import { ensureUserFromSupabase } from "../../../../../lib/auth/ensureUser";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    await leaveChallenge(id, userId);
    return NextResponse.json({ left: true });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const status = (e as { status?: number }).status;
    if (status === 404 || raw.includes("Not enrolled")) {
      return NextResponse.json({ error: "Not enrolled in this challenge" }, { status: 404 });
    }
    if (status === 409 || raw.includes("already completed")) {
      return NextResponse.json(
        { error: "Challenge already completed — cannot leave" },
        { status: 409 },
      );
    }
    if (raw.includes("not found")) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to leave challenge" }, { status: 500 });
  }
}
