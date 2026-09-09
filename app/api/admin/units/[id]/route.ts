import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { isCurrentUserAdmin } from "../../../../../lib/auth/requireAdmin";
import { unitSchema } from "../../../../../lib/validation/admin";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = unitSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await prisma.unit.update({ where: { id }, data: parsed.data as never });
  return NextResponse.json(updated);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.unit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
