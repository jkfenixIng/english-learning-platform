import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../lib/db";
import { requireAdminOrThrow } from "../../../../../../lib/auth/requireAdmin";

const roleSchema = z.object({
  role: z.enum(["admin", "student"]),
});

type Params = { params: Promise<{ id: string }> };

async function handleRoleChange(req: NextRequest, params: Params) {
  try {
    await requireAdminOrThrow();
  } catch {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const { id } = await params.params;
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { role: 'admin' | 'student' }" },
      { status: 400 },
    );
  }

  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (existing.role === parsed.data.role) {
      return NextResponse.json({ user: existing, message: `Already ${parsed.data.role}` });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json({ user: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Params) {
  return handleRoleChange(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: Params) {
  return handleRoleChange(req, ctx);
}

export async function PUT(req: NextRequest, ctx: Params) {
  return handleRoleChange(req, ctx);
}
