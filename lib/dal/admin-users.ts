import { prisma } from "../db";

export async function listUsers(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [users, total] = await Promise.all([
    prisma.user.findMany({ skip, take: pageSize, orderBy: { createdAt: "desc" }, select: { id: true, email: true, name: true, role: true, subscriptionTier: true, isPremium: true, createdAt: true } }),
    prisma.user.count(),
  ]);
  return { users, total, page, pageSize };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, locale: true, createdAt: true } });
  if (!user) return null;
  const attempts = await prisma.attempt.findMany({ where: { userId }, take: 10, orderBy: { createdAt: "desc" } });
  const progress = await prisma.progress.findMany({ where: { userId }, take: 10 });
  return { user, attempts, progress };
}
