-- Slice 3: C1-C2 + premium placeholders + admin Polish
ALTER TABLE "users" ADD COLUMN "subscription_tier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN "is_premium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "badges" ADD COLUMN "is_premium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shop_items" ADD COLUMN "is_premium" BOOLEAN NOT NULL DEFAULT false;
-- RLS polish: admin bypass is via service_role in Supabase dashboard (DAL enforces role check); no new table RLS here
