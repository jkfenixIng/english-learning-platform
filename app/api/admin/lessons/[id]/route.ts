import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { isCurrentUserAdmin } from "../../../../../lib/auth/requireAdmin";
import { lessonSchema } from "../../../../../lib/validation/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { unit: { include: { level: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lesson);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = lessonSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (d.unitId) data.unitId = d.unitId;
  if (d.title) data.title = d.title;
  if (d.objectives) data.objectives = d.objectives;
  if (d.orderIndex !== undefined) data.orderIndex = Number(d.orderIndex as number);
  if (d.estimatedMinutes !== undefined)
    data.estimatedMinutes = Number(d.estimatedMinutes as number);
  if (d.kind) {
    data.kind = d.kind;
    data.isQuiz = d.kind === "quiz";
    data.isExam = d.kind === "exam";
  }
  if (d.coverImage !== undefined) data.coverImage = (d.coverImage as string) || null;
  if (d.bodyMarkdown !== undefined) data.bodyMarkdown = (d.bodyMarkdown as string) || null;
  if (d.content !== undefined) data.content = d.content as never;
  if (d.isQuiz !== undefined && !d.kind) data.isQuiz = Boolean(d.isQuiz);
  if (d.isExam !== undefined && !d.kind) data.isExam = Boolean(d.isExam);
  const updated = await prisma.lesson.update({ where: { id }, data: data as never });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.lesson.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
