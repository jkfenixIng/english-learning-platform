# English Learning Platform — Slice 1 (A1-A2 Core)

Mobile-first, dark-mode, PWA, bilingual ES/EN platform for CEFR A1-C2 with AI tutor.

## Stack
Next.js 15 App Router · TypeScript strict · Tailwind CSS 4 · Supabase Postgres + Prisma · supabase-js + Supabase Auth · next-intl · Zustand 5 · Zod 4 · Vercel AI SDK 5 · Serwist PWA · Vitest

## Quick Start

```bash
npm install --legacy-peer-deps
cp .env.example .env   # fill Supabase values
npx prisma generate
npx prisma migrate dev --name init   # creates tables
npm run seed           # idempotent A1-A2 catalog + badges + shop + placement test
npm run dev            # http://localhost:3000
```

## Env Variables
```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY (optional, defaults to mock tutor)
GROQ_API_KEY (optional fallback)
AI_PROVIDER=mock|openrouter|groq
```

## Supabase Setup (free tier)
1. Create project at supabase.com (free)
2. Copy URL + anon key + service key to `.env`
3. `DATABASE_URL` is `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
4. Run migrations + seed as above
5. RLS: seed creates public read for catalog; owner isolation for user data. For full RLS enable, run `prisma/migrations/*_rls.sql` manually via Supabase SQL editor (optional for Slice 1 — server-side DAL enforces ownership).

## Scripts
- `npm run build` — production build
- `npm test` — Vitest (exercise evaluators, speech scoring, gamification)
- `npm run check-i18n` — verifies en/es keys match
- `npm run lint` / `npm run format`

## Project Structure
```
app/
  (marketing)/page.tsx    # public landing
  (auth)/login,register
  (app)/dashboard,levels,units,lessons,exercises,settings,shop,tutor
  api/ai/chat,correct,generate-exercise
  api/exercises/[id]/attempt
lib/
  exercises/registry + plugins/* (13 types)
  speech/ (SpeakingService, WebSpeechAdapter, MockAdapter, scoring, tts)
  ai/ (TutorProvider, router, mock/openrouter/groq, cache, rate-limit)
  gamification/ (xp, streak, badges)
  supabase/ dal/
prisma/ schema.prisma seed.ts
messages/en,es/common.json
```

## Exercise Types (13)
fill_blanks, ordering, transformation, flashcard, matching, listening_tts, dictation, comprehension, graded_reading, writing_prompt, speaking_record, shadowing, pronunciation — each via plugin registry (`lib/exercises/registry.ts`) with Zod schemas + evaluator + Renderer.

## Speaking
`SpeakingService` interface → `WebSpeechAdapter` (primary) + `MockAdapter` fallback. `isSupported()` gates UI; unsupported browsers show typed fallback.

## Tutor
`TutorProvider` abstraction + `ProviderRouter` (mock default, OpenRouter/Groq via env). Rate limit 20/day, cache by prompt hash.

## Slice Scope
- **Slice 1 (this):** A1-A2 content, all 13 types, speaking baseline, tutor baseline, evaluations (quiz per lesson + level exam), gamification baseline (XP/streak/badges, shop read-only), PWA stub, i18n toggle.
- Slice 2: B1-B2 + challenges + SRS + leaderboard
- Slice 3: C1-C2 + speaking advanced + admin CRUD + polish

## Deploy (Vercel)
Connect GitHub repo → Vercel → set env vars → build runs `prisma generate && next build`. Seed via `npm run seed` locally or `npx prisma db seed` on deployment.

## Free Tier Notes
No paid services required. AI defaults to mock; add `OPENROUTER_API_KEY` to enable free models (e.g., `meta-llama/llama-3.1-8b:free`).
