import { NextRequest, NextResponse } from "next/server";

// Deprecated alias — prefer POST /api/challenges/[id]/join
// Kept for backwards compatibility; delegates via 307 to canonical join route.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const joinUrl = new URL(`/api/challenges/${id}/join`, url.origin);
  return NextResponse.redirect(joinUrl, 307);
}
