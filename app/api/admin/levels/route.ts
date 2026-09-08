import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { levelSchema } from "../../../../lib/validation/admin";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const levels = await prisma.level.findMany({ orderBy: { orderIndex: "asc" } });
  return NextResponse.json(levels);
}

export async function POST(req: NextRequest) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = levelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const level = await prisma.level.upsert({
    where: { code: parsed.data.code as never },
    update: { title: parsed.data.title, description: parsed.data.description, orderIndex: parsed.data.orderIndex },
    create: { code: parsed.data.code as never, title: parsed.data.title, description: parsed.data.description, orderIndex: parsed.data.orderIndex },
  });
  return NextResponse.json(level);
}
