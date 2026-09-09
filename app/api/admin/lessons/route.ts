import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { isCurrentUserAdmin } from "../../../../lib/auth/requireAdmin";
import { lessonSchema } from "../../../../lib/validation/admin";

export async function GET(req: NextRequest) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const takeParam = searchParams.get("take");
  const take = Math.min(100, Math.max(1, parseInt(takeParam ?? "20", 10)));
  const skip = (page - 1) * take;
  const unitId = searchParams.get("unitId");
  const kind = searchParams.get("kind");
  const where: Record<string, unknown> = {};
  if (unitId) where.unitId = unitId;
  if (kind) where.kind = kind;
  const [lessons, total] = await Promise.all([
    prisma.lesson.findMany({
      where: where as never,
      include: { unit: { include: { level: true } } },
      orderBy: [{ orderIndex: "asc" }],
      skip,
      take,
    }),
    prisma.lesson.count({ where: where as never }),
  ]);
  // Support both paginated response and array for legacy client (LessonEditor fetches with take=100)
  if (takeParam) {
    return NextResponse.json(lessons);
  }
  return NextResponse.json({ lessons, total, page, take });
}

export async function POST(req: NextRequest) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = lessonSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const lesson = await prisma.lesson.create({
    data: {
      unitId: d.unitId,
      title: d.title,
      objectives: d.objectives,
      orderIndex: Number(d.orderIndex),
      estimatedMinutes: Number(d.estimatedMinutes),
      kind: (d.kind as never) ?? "teach",
      coverImage: d.coverImage || null,
      bodyMarkdown: d.bodyMarkdown || null,
      content: (d.content as never) ?? null,
      isQuiz: d.kind === "quiz" || d.isQuiz ? true : false,
      isExam: d.kind === "exam" || d.isExam ? true : false,
    },
  });
  return NextResponse.json(lesson);
}
