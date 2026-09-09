import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { isCurrentUserAdmin } from "../../../../../lib/auth/requireAdmin";
import { exerciseAdminSchema } from "../../../../../lib/validation/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const ex = await prisma.exercise.findUnique({ where: { id } });
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ex);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = exerciseAdminSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (parsed.data.lessonId) data.lessonId = parsed.data.lessonId;
  if (parsed.data.type) data.type = parsed.data.type;
  if (parsed.data.difficulty !== undefined) data.difficulty = parsed.data.difficulty;
  if (parsed.data.prompt !== undefined) data.prompt = parsed.data.prompt as never;
  if (parsed.data.solution !== undefined) data.solution = parsed.data.solution as never;
  if (parsed.data.assets !== undefined) data.assets = parsed.data.assets as never;
  if ((parsed.data as { aiGenerated?: boolean }).aiGenerated !== undefined)
    data.aiGenerated = (parsed.data as { aiGenerated?: boolean }).aiGenerated;
  const updated = await prisma.exercise.update({ where: { id }, data: data as never });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.exercise.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
