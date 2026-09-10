-- 003_coins.sql — moneda separada de XP (0 costo, sin Stripe)
-- Idempotente: safe to run multiple times.
-- Añade coins a user_streaks y migra XP actual a coins inicial para no perder saldo.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_streaks' AND column_name='coins'
  ) THEN
    ALTER TABLE public.user_streaks ADD COLUMN coins INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Migrar XP existente a coins donde coins = 0 (solo primera vez, no sobreescribe compras posteriores)
UPDATE public.user_streaks SET coins = xp WHERE coins = 0 AND xp > 0;

-- RLS already covers user_streaks via policy user_streaks_own (FOR ALL USING auth.uid()=user_id)

-- Record in _prisma_migrations if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') THEN
    INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (
      gen_random_uuid()::text,
      '003_coins',
      NOW(),
      '003_coins',
      NULL,
      NULL,
      NOW(),
      1
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;
