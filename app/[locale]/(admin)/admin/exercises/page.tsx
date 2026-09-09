import { prisma } from "../../../../../lib/db";
import { ExercisesAdminClient } from "../../../../../components/admin/ExercisesAdminClient";

export default async function AdminExercisesPage() {
  let exercises: {
    id: string;
    type: string;
    difficulty: number;
    lessonId: string;
    assets: unknown;
  }[] = [];
  try {
    exercises = await prisma.exercise.findMany({ take: 30, orderBy: { createdAt: "desc" } });
  } catch {
    exercises = [];
  }
  return <ExercisesAdminClient initialExercises={exercises as never} />;
}
