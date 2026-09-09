import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";
import { unitSchema } from "../../../../lib/validation/admin";

export async function GET() {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const units = await prisma.unit.findMany({
    include: { level: true },
    orderBy: { orderIndex: "asc" },
  });
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = unitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const unit = await prisma.unit.create({
    data: {
      levelId: parsed.data.levelId,
      title: parsed.data.title,
      description: parsed.data.description,
      orderIndex: Number(parsed.data.orderIndex),
    },
  });
  return NextResponse.json(unit);
}
