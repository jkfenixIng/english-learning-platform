# Scaling Beyond Free Tier — English Learning Platform

**Scope:** How to scale from 5 users (free tier) to 1000+ without rewrite.

## Current Free-Tier Stack
- **DB:** Supabase Postgres free (500MB, 2GB bandwidth, 50k MAU). All tables indexed; RLS via DAL + policies.
- **Auth:** Supabase Auth free 50k MAU.
- **Storage:** Supabase Storage free 1GB — not used for audio (transient IndexedDB), only for optional avatar assets.
- **PWA:** Serwist cache-first app shell, network-first catalog, SRS offline-first via IndexedDB mirror + background sync stub.
- **AI:** OpenRouter primary + Groq fallback via Vercel AI SDK, cached, rate-limited 20/day per user, template fallback. No paid STT/TTS (Web Speech + WASM spike).
- **Deploy:** Vercel Hobby free, Hobby bandwidth, preview per PR.

## Bottlenecks at Scale
| Layer | Trigger | Symptom |
|-------|---------|---------|
| Postgres | >500MB or >100 active connections | Slow queries, connection exhaustion |
| Supabase Auth | >50k MAU | Throttling |
| Vercel Functions | >100GB-hours | Cold starts |
| Serwist/AI cache | Large `public/sw.js` bundle | PWA install slow |
| Leaderboard | No Redis | Cache recompute on every request |

## Recommended Upgrade Path (No Rewrite)
1. **DB:** Upgrade Supabase to Pro ($25/mo) → 8GB, point-in-time restore, connection pooling via PgBouncer (already via `prisma` + `pg`). Add `pg_cron` for challenge expiry.
2. **Read scaling:** Add read replica for leaderboard/SRS; Prisma `readReplica` extension.
3. **Cache:** Replace in-memory leaderboard 5-min TTL with Upstash Redis free → Vercel KV; keep DAL same (adapter pattern).
4. **Storage:** Move optional audio uploads to Cloudflare R2 (10GB free) if user opts in.
5. **AI:** Add provider router weighted fallback + per-user quota in `lib/ai/rate-limit.ts`; cache in Redis.
6. **PWA:** Version service worker (`CACHE_VERSION`), background sync queue persists failed `/api/srs/review` + `/api/exercises/[id]/attempt` in IndexedDB and replays on `online` (stub `lib/pwa/sync-queue.ts`).
7. **Monitoring:** Vercel Analytics + Supabase Dashboard → alerts on DB size, MAU, function duration.

## Zero-Paid Constraints Preserved
Until scale trigger, no paid services are required. Paywall placeholders (`lib/monetization/guard.ts`, `/shop` premium badge) are route-guarded stubs; Stripe wiring will gate `isPremium` without changing schema.

## Operational Checklist
- Nightly `pg_dump` via GitHub Action to artifact (rollback plan per proposal §9).
- `npm run seed` idempotent — rerun on branch before merge.
- RLS policies remain `auth.uid() = user_id` for student isolation; admin bypass only via `service_role` env (never client anon key).
