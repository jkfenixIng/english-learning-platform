-- 002_shop_equip.sql — equip support for shop (0 cost)
-- Idempotent: safe to run multiple times.
-- Adds equipped + equippedAt to user_inventory and allows "equipar" cosméticos.

-- Add columns if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_inventory' AND column_name='equipped'
  ) THEN
    ALTER TABLE public.user_inventory ADD COLUMN equipped BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_inventory' AND column_name='equipped_at'
  ) THEN
    ALTER TABLE public.user_inventory ADD COLUMN equipped_at TIMESTAMPTZ;
  END IF;
END $$;

-- Optional: index for equipped lookup
CREATE INDEX IF NOT EXISTS idx_user_inventory_equipped ON public.user_inventory(user_id, equipped) WHERE equipped = true;

-- Record in _prisma_migrations if table exists (prisma migrate compatibility)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') THEN
    INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (
      gen_random_uuid()::text,
      '002_shop_equip',
      NOW(),
      '002_shop_equip',
      NULL,
      NULL,
      NOW(),
      1
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;
