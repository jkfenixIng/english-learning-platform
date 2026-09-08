import { NextResponse } from "next/server";
import { schedulerTick } from "../../../../lib/challenges/service";

export async function GET() { const r = await schedulerTick(new Date()); return NextResponse.json(r); }
export async function POST() { const r = await schedulerTick(new Date()); return NextResponse.json(r); }
