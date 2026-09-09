-- Lesson kind + teaching content (non-destructive, keeps isQuiz/isExam as deprecated compat)
CREATE TYPE "LessonKind" AS ENUM ('teach', 'practice', 'quiz', 'exam');
ALTER TABLE "lessons" ADD COLUMN "kind" "LessonKind" NOT NULL DEFAULT 'teach';
ALTER TABLE "lessons" ADD COLUMN "content" JSONB;
ALTER TABLE "lessons" ADD COLUMN "cover_image" TEXT;
ALTER TABLE "lessons" ADD COLUMN "body_markdown" TEXT;
-- Backfill kind from legacy booleans
UPDATE "lessons" SET "kind" = 'exam' WHERE "is_exam" = true;
UPDATE "lessons" SET "kind" = 'quiz' WHERE "is_quiz" = true AND "is_exam" = false;
