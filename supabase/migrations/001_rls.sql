-- 001_rls.sql — Row Level Security (0 USD)
-- Aplicar: Supabase Dashboard > SQL Editor > paste > Run
--         o `supabase db push` / `psql $DATABASE_URL -f supabase/migrations/001_rls.sql`
-- Idempotente: usa DROP POLICY IF EXISTS y ENABLE ROW LEVEL SECURITY idempotente.
-- Nota: Prisma/DATABASE_URL usa rol `postgres` (bypassa RLS). RLS protege acceso
-- directo via Supabase JS (anon/authenticated). Service role bypassa RLS por diseño.

-- Helper: verifica si usuario es admin sin recursión RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============ USERS ============
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin()) WITH CHECK (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============ USER_PREFERENCES ============
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_preferences_own" ON public.user_preferences;
CREATE POLICY "user_preferences_own" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ USER_AI_SETTINGS ============
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_ai_settings_own" ON public.user_ai_settings;
CREATE POLICY "user_ai_settings_own" ON public.user_ai_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ USER_STREAKS ============
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_streaks_own" ON public.user_streaks;
CREATE POLICY "user_streaks_own" ON public.user_streaks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ATTEMPTS ============
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attempts_own" ON public.attempts;
CREATE POLICY "attempts_own" ON public.attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "attempts_admin_read" ON public.attempts;
CREATE POLICY "attempts_admin_read" ON public.attempts
  FOR SELECT USING (public.is_admin());

-- ============ PROGRESS ============
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progress_own" ON public.progress;
CREATE POLICY "progress_own" ON public.progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "progress_admin_read" ON public.progress;
CREATE POLICY "progress_admin_read" ON public.progress
  FOR SELECT USING (public.is_admin());

-- ============ SRS_CARDS ============
ALTER TABLE public.srs_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "srs_cards_own" ON public.srs_cards;
CREATE POLICY "srs_cards_own" ON public.srs_cards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SRS_REVIEWS (via card owner) ============
ALTER TABLE public.srs_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "srs_reviews_via_card" ON public.srs_reviews;
CREATE POLICY "srs_reviews_via_card" ON public.srs_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.srs_cards c WHERE c.id = srs_reviews.card_id AND c.user_id = auth.uid())
    OR public.is_admin()
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.srs_cards c WHERE c.id = srs_reviews.card_id AND c.user_id = auth.uid())
  );

-- ============ CHALLENGE_PARTICIPANTS ============
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenge_participants_own" ON public.challenge_participants;
CREATE POLICY "challenge_participants_own" ON public.challenge_participants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ USER_INVENTORY ============
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_inventory_own" ON public.user_inventory;
CREATE POLICY "user_inventory_own" ON public.user_inventory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ USER_BADGES ============
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_badges_own" ON public.user_badges;
CREATE POLICY "user_badges_own" ON public.user_badges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_badges_admin_read" ON public.user_badges;
CREATE POLICY "user_badges_admin_read" ON public.user_badges
  FOR SELECT USING (public.is_admin());

-- ============ NOTIFICATIONS ============
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PLACEMENT_ATTEMPTS ============
ALTER TABLE public.placement_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "placement_attempts_own" ON public.placement_attempts;
CREATE POLICY "placement_attempts_own" ON public.placement_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CATALOG: public read, write admin/service_role only ============
-- Catalog tables are readable by everyone (anon + authenticated) but writes
-- are blocked for normal users; only service_role / admin can write.
-- Prisma via DATABASE_URL (postgres role) bypassa RLS, so seed/admin via Prisma works.

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "levels_public_read" ON public.levels;
CREATE POLICY "levels_public_read" ON public.levels FOR SELECT USING (true);
DROP POLICY IF EXISTS "levels_admin_write" ON public.levels;
CREATE POLICY "levels_admin_write" ON public.levels FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "units_public_read" ON public.units;
CREATE POLICY "units_public_read" ON public.units FOR SELECT USING (true);
DROP POLICY IF EXISTS "units_admin_write" ON public.units;
CREATE POLICY "units_admin_write" ON public.units FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_public_read" ON public.lessons;
CREATE POLICY "lessons_public_read" ON public.lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "lessons_admin_write" ON public.lessons;
CREATE POLICY "lessons_admin_write" ON public.lessons FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exercises_public_read" ON public.exercises;
CREATE POLICY "exercises_public_read" ON public.exercises FOR SELECT USING (true);
DROP POLICY IF EXISTS "exercises_admin_write" ON public.exercises;
CREATE POLICY "exercises_admin_write" ON public.exercises FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_items_public_read" ON public.shop_items;
CREATE POLICY "shop_items_public_read" ON public.shop_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "shop_items_admin_write" ON public.shop_items;
CREATE POLICY "shop_items_admin_write" ON public.shop_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenges_public_read" ON public.challenges;
CREATE POLICY "challenges_public_read" ON public.challenges FOR SELECT USING (true);
DROP POLICY IF EXISTS "challenges_admin_write" ON public.challenges;
CREATE POLICY "challenges_admin_write" ON public.challenges FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_public_read" ON public.badges;
CREATE POLICY "badges_public_read" ON public.badges FOR SELECT USING (true);
DROP POLICY IF EXISTS "badges_admin_write" ON public.badges;
CREATE POLICY "badges_admin_write" ON public.badges FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.placement_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "placement_tests_public_read" ON public.placement_tests;
CREATE POLICY "placement_tests_public_read" ON public.placement_tests FOR SELECT USING (true);

ALTER TABLE public.placement_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "placement_questions_public_read" ON public.placement_questions;
CREATE POLICY "placement_questions_public_read" ON public.placement_questions FOR SELECT USING (true);

ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leaderboard_cache_public_read" ON public.leaderboard_cache;
CREATE POLICY "leaderboard_cache_public_read" ON public.leaderboard_cache FOR SELECT USING (true);
