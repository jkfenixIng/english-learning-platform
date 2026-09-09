import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";
import { exerciseAdminSchema } from "../../../../lib/validation/admin";

export async function GET(req: NextRequest) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const lessonId = req.nextUrl.searchParams.get("lessonId");
  const where = lessonId ? { lessonId } : {};
  const exercises = await prisma.exercise.findMany({
    where,
    take: 50,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(exercises);
}

export async function POST(req: NextRequest) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = exerciseAdminSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const ex = await prisma.exercise.create({
    data: {
      lessonId: parsed.data.lessonId,
      type: parsed.data.type as never,
      difficulty: parsed.data.difficulty,
      prompt: parsed.data.prompt as never,
      solution: parsed.data.solution as never,
      aiGenerated: parsed.data.aiGenerated ?? false,
      ...(parsed.data.assets ? { assets: parsed.data.assets as never } : {}),
    },
  });
  return NextResponse.json(ex);
}

export async function PATCH(req: NextRequest) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id, ...rest } = body as { id: string } & Record<string, unknown>;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const parsed = exerciseAdminSchema.partial().safeParse(rest);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data: Record<string, unknown> = {};
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
