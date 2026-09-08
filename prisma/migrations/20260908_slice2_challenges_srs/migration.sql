-- Slice 2: Challenges, SRS, Leaderboard, Notifications
CREATE TYPE "ChallengeType" AS ENUM ('daily','weekly','timed','streak','competitive');
CREATE TABLE "challenges" ("id" UUID PRIMARY KEY, "type" "ChallengeType" NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "rule" JSONB, "start_at" TIMESTAMPTZ NOT NULL, "end_at" TIMESTAMPTZ NOT NULL, "reward_xp" INT NOT NULL DEFAULT 50, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE "challenge_participants" ("id" UUID PRIMARY KEY, "challenge_id" UUID NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE, "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "progress" JSONB DEFAULT '{}'::jsonb, "completed" BOOLEAN NOT NULL DEFAULT false, "completed_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE("challenge_id","user_id"));
CREATE INDEX "challenges_type_start_at_idx" ON "challenges"("type","start_at");
CREATE INDEX "challenge_participants_user_id_completed_idx" ON "challenge_participants"("user_id","completed");
CREATE TABLE "srs_cards" ("id" UUID PRIMARY KEY, "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "exercise_id" UUID NOT NULL REFERENCES "exercises"("id") ON DELETE CASCADE, "interval" INT NOT NULL DEFAULT 0, "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5, "repetitions" INT NOT NULL DEFAULT 0, "due_date" DATE NOT NULL, "lapses" INT NOT NULL DEFAULT 0, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE("user_id","exercise_id"));
CREATE INDEX "srs_cards_user_id_due_date_idx" ON "srs_cards"("user_id","due_date");
CREATE TABLE "srs_reviews" ("id" UUID PRIMARY KEY, "card_id" UUID NOT NULL REFERENCES "srs_cards"("id") ON DELETE CASCADE, "quality" INT NOT NULL, "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX "srs_reviews_card_id_reviewed_at_idx" ON "srs_reviews"("card_id","reviewed_at");
CREATE TABLE "notifications" ("id" UUID PRIMARY KEY, "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "type" TEXT NOT NULL, "payload" JSONB, "read" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id","read");
CREATE TABLE "leaderboard_cache" ("id" UUID PRIMARY KEY, "window" TEXT NOT NULL, "user_id" UUID NOT NULL, "xp" INT NOT NULL, "rank" INT NOT NULL, "computed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE("window","user_id"));
CREATE INDEX "leaderboard_cache_window_rank_idx" ON "leaderboard_cache"("window","rank");
ALTER TABLE "user_preferences" ADD COLUMN "challenges_enabled" BOOLEAN NOT NULL DEFAULT true;
-- RLS placeholder (enforced via DAL, policies to be applied in Supabase dashboard)
