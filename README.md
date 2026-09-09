<div align="center">

# 🎓 English Learning Platform

### Learn English from A1 to C2 — at your own pace

**Gamified · Bilingual · AI-Powered · Offline-Ready**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![next-intl](https://img.shields.io/badge/i18n-next--intl-7C3AED?style=for-the-badge)](https://next-intl-docs.vercel.app/)
[![AI SDK](https://img.shields.io/badge/AI_SDK-5-FF6B35?style=for-the-badge&logo=openai&logoColor=white)](https://sdk.vercel.ai/)

**[🌐 Live Demo](https://english-learning-platform-rust.vercel.app) · [🇺🇸 English](https://english-learning-platform-rust.vercel.app/en) · [🇪🇸 Español](https://english-learning-platform-rust.vercel.app/es) · [📖 Docs](#-getting-started)**

</div>

---

> **What is it?** A mobile-first, dark-mode, PWA-ready platform that takes learners from **CEFR A1 → C2** through structured Levels → Units → Lessons → Exercises, with **gamification**, **spaced repetition (SRS)**, **AI tutor**, and a full **admin console**. Built for real students and real teachers — not just a demo.

| For                        | Why it's useful                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Learners (A1–C2)**       | Clear progression path, instant feedback on 13 exercise types, streaks/XP/badges that keep you coming back |
| **Self-learners ES/EN**    | Entire UI in English or Spanish, placement test to start at the right level                                |
| **Teachers / Admins**      | CRUD for levels, units, lessons, exercises, badges, shop + user management + seed controls                 |
| **Developers / Portfolio** | Clean App Router + Prisma + Supabase architecture, plugin-based exercise system, provider-agnostic AI      |

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🖼️ Demo & Screenshots](#️-demo--screenshots)
- [🧱 Tech Stack](#-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [🌐 Internationalization](#-internationalization)
- [🚀 Getting Started](#-getting-started)
- [📜 Scripts](#-scripts)
- [📁 Project Structure](#-project-structure)
- [☁️ Deployment](#️-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License & Free Tier](#-license--free-tier)

---

## ✨ Features

### 🧭 Learning Journey

| Feature               | What it does                                                                                       | Where                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **6 CEFR Levels**     | A1 → C2, each with title, description, ordered progression                                         | `app/[locale]/(app)/levels/[code]` · `Level` model |
| **Units**             | 2 units per level (e.g. A1: Basics, Daily Life / C1: Academic Discourse, Professional Negotiation) | `units/[id]`                                       |
| **Lessons**           | Ordered lessons per unit, with `isQuiz` / `isExam` flags, estimated minutes, objectives            | `lessons/[id]`                                     |
| **13 Exercise Types** | Every exercise is a Zod-validated plugin with its own evaluator + Renderer                         | `lib/exercises/plugins/*` → see table below        |
| **Placement Test**    | Adaptive entry test to recommend starting level                                                    | `PlacementTest` / `PlacementAttempt`               |

### 🧩 13 Exercise Types (Plugin Registry)

All via `lib/exercises/registry.ts` — each type has `schema · evaluator · Renderer`:

| #   | Type              | Example                                 |
| --- | ----------------- | --------------------------------------- |
| 1   | `fill_blanks`     | She ___ (go) yesterday → `went`         |
| 2   | `ordering`        | Reorder tokens to form a sentence       |
| 3   | `transformation`  | Make negative / Passive voice           |
| 4   | `flashcard`       | Front/back + image                      |
| 5   | `matching`        | Match left ↔ right pairs                |
| 6   | `listening_tts`   | TTS playback + comprehension question   |
| 7   | `dictation`       | Listen and type what you heard          |
| 8   | `comprehension`   | Read passage → answer                   |
| 9   | `graded_reading`  | Long-form reading + vocab + multi-Q     |
| 10  | `writing_prompt`  | Free writing with word-count guardrails |
| 11  | `speaking_record` | Record & compare to reference           |
| 12  | `shadowing`       | Repeat at variable speed                |
| 13  | `pronunciation`   | Word + phonetic + example               |

### 🎮 Gamification & Social

| Feature          | Details                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **XP & Streaks** | `UserStreak` (current/longest, freeze, last activity) · XP awarded per attempt                                           |
| **Badges**       | Collectible, rule-driven, with `UserBadge` join table · detail at `/badges/[code]`                                       |
| **Shop**         | `ShopItem` (priceXp, rarity, cosmeticType) + `UserInventory` · `/shop` + `POST /api/shop/purchase`                       |
| **Challenges**   | Daily / weekly / timed / streak / competitive · `/challenges` · cron `0 0 * * *` rotates daily challenges                |
| **Leaderboard**  | `LeaderboardCache` (window + rank) · `/leaderboard` · `GET /api/leaderboard`                                             |
| **SRS Reviews**  | SM-2 based `SrsCard` (interval, easeFactor, dueDate) + `SrsReview` · `/reviews` · `POST /api/srs/review` · offline queue |
| **Progress**     | Per-lesson `Progress` (not_started → completed, bestScore)                                                               |

### 🤖 AI Tutor

| Capability              | Implementation                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chat Tutor**          | `POST /api/ai/chat` — conversational help grounded in current lesson                                                                                |
| **Writing Correction**  | `POST /api/ai/correct` — grammar/style feedback                                                                                                     |
| **Exercise Generation** | `POST /api/ai/generate-exercise` — on-demand exercise creation                                                                                      |
| **Provider Router**     | `TutorProvider` abstraction → `ProviderRouter` picks `mock` (default) / `openrouter` / `groq` via env · rate-limited 20/day · cached by prompt hash |
| **Free-tier default**   | Works with no API key (mock). Add `OPENROUTER_API_KEY` for real models like `meta-llama/llama-3.1-8b:free`                                          |

### 🗣️ Speaking

`SpeakingService` interface → `WebSpeechAdapter` (primary) + `MockAdapter` fallback. `isSupported()` gates the UI; unsupported browsers show a typed fallback. Scoring + TTS via `lib/speech/`.

### 🛡️ Admin Console

Available at `/admin` (protected, role-gated). Full CRUD + seeding:

`levels` · `units` · `lessons` · `exercises` · `badges` · `shop` · `challenges` · `users` · `seed`

APIs: `POST /api/admin/levels` · `POST /api/admin/exercises` · `POST /api/admin/seed`

### 📱 PWA & UX

- **Serwist** service worker (`app/sw.ts`) with `CACHE_VERSION = "elp-v3"` — install/activate lifecycle, stale-cache cleanup, skip-waiting
- **Offline-first SRS queue** (`lib/pwa/sync-queue.ts`) — queues failed `POST /api/srs` & exercise attempts to `localStorage` and replays on `online`
- **Mobile-first & dark-mode** via Tailwind CSS 4
- **Auth** via Supabase Auth (SSR, `@supabase/ssr`) — middleware protects `/dashboard`, `/levels`, `/admin`, `/tutor`, etc.

---

## 🖼️ Demo & Screenshots

> Replace placeholders with real captures — keeps the README portfolio-ready.

| Landing (Marketing)                                                                    | Dashboard                                                                    | Lesson / Exercise                                                                 |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| ![Landing placeholder](https://via.placeholder.com/360x220?text=Landing+%2F+Marketing) | ![Dashboard placeholder](https://via.placeholder.com/360x220?text=Dashboard) | ![Exercise placeholder](https://via.placeholder.com/360x220?text=Exercise+Runner) |

**Live URLs:**

- Production: **https://english-learning-platform-rust.vercel.app**
- English: **https://english-learning-platform-rust.vercel.app/en**
- Español: **https://english-learning-platform-rust.vercel.app/es**

Tip: append `/dashboard`, `/levels/A1`, `/tutor`, `/reviews`, `/leaderboard`, `/admin` to explore the app (auth required for protected routes).

---

## 🧱 Tech Stack

| Layer          | Technology                                          | Notes                                               |
| -------------- | --------------------------------------------------- | --------------------------------------------------- |
| **Framework**  | [Next.js 15](https://nextjs.org/) App Router        | `[locale]` segment, `middleware.ts` for i18n + auth |
| **Language**   | TypeScript 5.7 (strict)                             | `tsc --noEmit` in CI                                |
| **Styling**    | Tailwind CSS 4 + `tailwind-merge` + `clsx`          | Mobile-first, dark-mode                             |
| **i18n**       | `next-intl` 4.1                                     | `en` / `es`, `localePrefix: "as-needed"`            |
| **State**      | Zustand 5                                           | Client stores in `lib/stores/`                      |
| **Validation** | Zod 4                                               | Exercise schemas, API payloads, env                 |
| **Database**   | Supabase Postgres + Prisma 6                        | `prisma/schema.prisma` — 17 models                  |
| **Auth**       | Supabase Auth (`@supabase/ssr` + `supabase-js`)     | SSR session, DAL ownership checks                   |
| **AI**         | Vercel AI SDK 4 + `@ai-sdk/openai`                  | Provider router: mock / OpenRouter / Groq           |
| **PWA**        | Serwist 9.1                                         | `app/sw.ts` + offline sync queue                    |
| **Testing**    | Vitest 3 + Testing Library + jsdom                  | Evaluators, speech scoring, gamification            |
| **Tooling**    | ESLint 9 + Prettier + `prettier-plugin-tailwindcss` | `eslint-config-next`, `jsx-a11y`                    |
| **Deploy**     | Vercel                                              | `prisma generate && next build`, daily cron         |

---

## 🏗️ Architecture

### High-level flow

```mermaid
flowchart TD
    User --> Middleware["middleware.ts<br/>next-intl + Supabase Auth"]
    Middleware --> AppRouter["Next.js 15 App Router<br/>app/[locale]/{(marketing),(auth),(app),(admin)}"]
    AppRouter --> Pages["Pages: dashboard · levels · units<br/>lessons · exercises · reviews<br/>challenges · leaderboard · shop · tutor · admin"]
    Pages --> API["API Routes<br/>/api/ai/* · /api/exercises/[id]/attempt<br/>/api/srs/review · /api/shop/*<br/>/api/challenges/* · /api/leaderboard · /api/admin/*"]
    API --> DAL["DAL + Prisma Client<br/>lib/dal + lib/supabase"]
    DAL --> DB[("Supabase Postgres<br/>17 models · CEFR A1-C2")]
    API --> AI["AI Provider Router<br/>mock · openrouter · groq<br/>rate-limit 20/day + cache"]
    Pages --> Speech["SpeakingService<br/>WebSpeechAdapter / MockAdapter"]
    Pages --> Gamification["Gamification<br/>XP · Streak · Badges · Shop"]
    Pages --> SRS["SRS Engine<br/>SM-2 · SrsCard / SrsReview"]
    AppRouter --> PWA["Serwist PWA<br/>sw.ts + sync-queue<br/>offline-first reviews"]
    DB --> Cron["Vercel Cron<br/>0 0 * * * → /api/challenges/cron"]
```

### Data model (Prisma — excerpt)

```
User ─┬─ UserPreferences · UserStreak · UserBadge · UserInventory
      ├─ Attempt ── Exercise ── Lesson ── Unit ── Level (CefrLevel A1-C2)
      ├─ Progress (per lesson)
      ├─ SrsCard ── SrsReview
      ├─ ChallengeParticipant ── Challenge
      └─ Notification

Catalog: Level → Unit → Lesson → Exercise (13 types, JSON prompt/solution)
Economy: Badge / ShopItem / LeaderboardCache
Placement: PlacementTest → PlacementQuestion → PlacementAttempt
```

> Full schema: [`prisma/schema.prisma`](prisma/schema.prisma)

---

## 🌐 Internationalization

- **Locales:** `en` (default) · `es` — defined in [`lib/i18n/routing.ts`](lib/i18n/routing.ts) via `defineRouting({ locales: ["en","es"], defaultLocale: "en", localePrefix: "as-needed" })`
- **Strategy:** `as-needed` — English URLs have no prefix (`/dashboard`), Spanish URLs are prefixed (`/es/dashboard`). Root `/` negotiates via `Accept-Language`.
- **Messages:** `messages/en/common.json` + `messages/es/common.json` (122 keys each) — loaded via `lib/i18n/request.ts` with `getRequestConfig`.
- **Verification:** `npm run check-i18n` — fails CI if `en`/`es` keys diverge.
- **Middleware:** `next-intl/middleware` runs first; then Supabase Auth check for protected routes.

Add a new locale:

1. Add code to `routing.locales` in `lib/i18n/routing.ts`
2. Create `messages/{locale}/common.json` (copy `en` as base)
3. Update `request.ts` locale guard

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (Next.js 15 requires ≥18.17)
- **npm** 10+
- **Supabase** account (free tier) — or any Postgres for `DATABASE_URL`
- No paid AI key required — tutor runs in `mock` mode by default

### 1. Clone & Install

```bash
git clone https://github.com/<you>/english-learning-platform.git
cd english-learning-platform
npm install --legacy-peer-deps
```

### 2. Environment

Copy the example and fill values:

```bash
cp .env.example .env
```

Required variables:

| Variable                        | Where to get it                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | Supabase → Project Settings → Database → Connection string: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL                                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon / publishable key                                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase → API → service_role (server-only)                                                                                           |
| `AI_PROVIDER`                   | `mock` (default) \| `openrouter` \| `groq`                                                                                            |
| `OPENROUTER_API_KEY`            | _(optional)_ [openrouter.ai](https://openrouter.ai/) — enables free models like `meta-llama/llama-3.1-8b:free`                        |
| `GROQ_API_KEY`                  | _(optional)_ [groq.com](https://console.groq.com/) — fallback provider                                                                |

### 3. Database & Seed

```bash
npx prisma generate
npx prisma migrate dev --name init   # creates tables locally
npm run seed                          # idempotent: Levels A1-C2, units, lessons, 13-type exercises, badges, shop, placement test
```

> **Supabase RLS (optional for Slice 1):** Seed creates public read for catalog + owner isolation for user data via the server DAL. For full Row Level Security, run the SQL in `prisma/migrations/*_rls.sql` manually via Supabase SQL Editor.

### 4. Run Dev Server

```bash
npm run dev   # http://localhost:3000
# → /      redirects via locale negotiation (e.g. /es if browser is Spanish)
# → /en    English (no prefix also works for default)
# → /es    Spanish
```

### 5. Production Build

```bash
npm run build   # prisma generate is handled by vercel.json buildCommand
npm start
```

### 6. Crear admin (Admin access)

El modulo `/admin` es **solo para `role='admin'`** — estudiantes no lo ven en el sidebar ni pueden abrirlo (403). Elige una opcion (cero costo):

**Opcion 1 -- `ADMIN_EMAILS` (dev, sin tocar DB, la mas rapida):**

```bash
# .env
ADMIN_EMAILS="tu@email.com,otro@email.com"
# reinicia dev server
npm run dev
```

`lib/auth/requireAdmin.ts` trata esa lista como admin aunque `users.role` siga siendo `student`. Ideal para probar local sin migrar.

**Opcion 2 -- Script (prod DB con `DATABASE_URL`):**

```bash
# El usuario debe existir en public.users (que se cree al hacer login una vez)
npx tsx scripts/promote-admin.ts tu@email.com
# o
npm run admin:promote -- tu@email.com
# revertir
npx tsx scripts/promote-admin.ts tu@email.com --demote
# verificar
psql $DATABASE_URL -c "SELECT id, email, role FROM users WHERE email='tu@email.com';"
```

El script hace `UPDATE users SET role='admin' WHERE email='...'`. Si no encuentra la fila, te pide que el usuario se loguee primero via `/login` o `/register` para que `ensureUserExists` cree la fila con `id == auth.users.id` (FK). Luego cierra sesion y vuelve a entrar.

**Opcion 3 -- SQL directo (Supabase SQL Editor o psql):**

```sql
-- Supabase Dashboard -> SQL Editor
UPDATE users SET role='admin' WHERE email='tu@email.com';
-- verificar
SELECT id, email, role FROM users WHERE email='tu@email.com';
```

En Supabase el `id` de `public.users` debe coincidir con `auth.users.id`. Si el usuario aun no tiene fila en `public.users`, primero debe loguearse; si insistes en crearlo manual, usa el UUID de `auth.users`:

```sql
INSERT INTO users (id, email, name, role) VALUES ('<auth-uid>', 'tu@email.com', 'Admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role='admin';
```

**Endpoint para UI futura (solo admin puede promover):**

```
PATCH /api/admin/users/[id]/role  { "role": "admin" | "student" }
# ej. curl -X PATCH http://localhost:3000/api/admin/users/<uuid>/role -H "Content-Type: application/json" -d '{"role":"admin"}'
```

Protegido por `requireAdminOrThrow` -> 403 si no eres admin.

Notas: `User.role` default es `student` (`prisma/schema.prisma`). Middleware protege `/admin` por sesion y allow-list `ADMIN_EMAILS` (fast-path); el gate autoritativo es `app/[locale]/(admin)/admin/layout.tsx` que devuelve 403 con mensaje claro y estilos dark. `AppShell` es Server Component que hace `await isCurrentUserAdmin()` y pasa `isAdmin` a `AppSidebar` (client) que filtra `sections.filter(s => s.title !== tNav("sections.admin") || isAdmin)`.

---

## 📜 Scripts

| Script          | Command                                | What it does                                                   |
| --------------- | -------------------------------------- | -------------------------------------------------------------- |
| `dev`           | `next dev`                             | Start dev server with HMR                                      |
| `build`         | `next build`                           | Production build (Vercel runs `prisma generate && next build`) |
| `start`         | `next start`                           | Serve production build                                         |
| `lint`          | `eslint .`                             | Lint entire repo                                               |
| `lint:fix`      | `eslint . --fix`                       | Lint + auto-fix                                                |
| `format`        | `prettier --write .`                   | Format with Prettier + tailwind plugin                         |
| `format:check`  | `prettier --check .`                   | CI format check                                                |
| `typecheck`     | `tsc --noEmit`                         | Strict type check                                              |
| `test`          | `vitest run`                           | Run Vitest suite once                                          |
| `test:watch`    | `vitest`                               | Watch mode                                                     |
| `seed`          | `tsx prisma/seed.ts`                   | Idempotent catalog seed (A1-C2)                                |
| `check-i18n`    | `tsx scripts/check-i18n.ts`            | Verify `en`/`es` keys are in sync                              |
| `db:generate`   | `prisma generate`                      | Regenerate Prisma Client                                       |
| `db:migrate`    | `prisma migrate dev`                   | Create & apply migration (dev)                                 |
| `db:deploy`     | `prisma migrate deploy`                | Apply migrations (prod/CI)                                     |
| `admin:promote` | `tsx scripts/promote-admin.ts <email>` | Promote user to admin by email (`--demote` to revert)          |

---

## 📁 Project Structure

```
app/
├── layout.tsx                  # root layout (html lang, providers)
├── globals.css                 # Tailwind 4 + design tokens
├── sw.ts                       # Serwist service worker (CACHE_VERSION elp-v3, offline SRS)
├── api/
│   ├── ai/chat, correct, generate-exercise
│   ├── exercises/[id]/attempt  # submit & score
│   ├── srs/review              # SM-2 review
│   ├── shop/purchase
│   ├── challenges/[id]/enroll, join + cron
│   ├── leaderboard
│   └── admin/levels, exercises, seed
└── [locale]/                   # next-intl locale segment (en/es, as-needed)
    ├── layout.tsx
    ├── (marketing)/page.tsx    # public landing
    ├── (auth)/login, register  # Supabase Auth
    ├── (app)/                  # authenticated app shell
    │   ├── dashboard
    │   ├── levels/[code]       # A1-C2 level view
    │   ├── units/[id]
    │   ├── lessons/[id]
    │   ├── exercises/[id]      # ExerciseRunner + 13 renderers
    │   ├── reviews             # SRS due cards
    │   ├── challenges
    │   ├── leaderboard
    │   ├── shop
    │   ├── badges/[code]
    │   ├── tutor               # AI chat
    │   └── settings
    └── (admin)/admin/          # role-gated admin
        ├── levels, units, lessons, exercises
        ├── badges, shop, challenges, users, seed

lib/
├── exercises/registry.ts + plugins/* (13 types)
├── speech/  SpeakingService, WebSpeechAdapter, MockAdapter, scoring, tts
├── ai/      TutorProvider, ProviderRouter, mock/openrouter/groq, cache, rate-limit
├── gamification/ xp, streak, badges
├── srs/     SM-2 engine
├── supabase/ + dal/  SSR client + data access layer
├── i18n/    routing.ts, request.ts
├── pwa/     sync-queue (offline-first)
└── stores/  Zustand 5 stores

prisma/
├── schema.prisma   # 17 models, enums CefrLevel / ExerciseType / ChallengeType
├── seed.ts         # idempotent A1-C2 seed (templates per level)
└── migrations/

messages/
├── en/common.json  # 122 keys
└── es/common.json  # 122 keys (in sync via check-i18n)
```

---

## ☁️ Deployment

### Vercel (recommended)

1. Connect GitHub repo to Vercel (import project)
2. Set **Environment Variables** in Vercel dashboard (same as `.env`)
3. Build settings are preconfigured in [`vercel.json`](vercel.json):

```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install --legacy-peer-deps",
  "crons": [{ "path": "/api/challenges/cron", "schedule": "0 0 * * *" }]
}
```

4. Deploy — first build will run migrations via `prisma generate && next build`
5. Seed production DB (once):

```bash
# from local, pointed at prod DATABASE_URL
npx prisma migrate deploy
npm run seed
# or via Vercel CLI / /api/admin/seed (admin-only)
```

### Cron

- `GET /api/challenges/cron` runs **daily at 00:00 UTC** — rotates daily challenges, expires old ones, seeds new. Configured in `vercel.json` crons (Vercel Cron Jobs, free tier: 1 daily job).

### Env on Vercel

Set at **Project → Settings → Environment Variables** — redeploy after changes. `NEXT_PUBLIC_*` vars are inlined at build time.

---

## 🤝 Contributing

Contributions are welcome — keep it small and focused.

```bash
# 1. Branch from main
git checkout -b feat/your-feature

# 2. Make changes, then verify
npm run lint && npm run typecheck && npm test && npm run check-i18n

# 3. Commit (conventional commits)
git commit -m "feat: add pronunciation scoring threshold"

# 4. Push & open PR
git push -u origin feat/your-feature
```

**Guidelines:**

- Run `npm run format` before pushing — Prettier + `prettier-plugin-tailwindcss` is enforced
- Keep `messages/en` and `messages/es` in sync (CI runs `check-i18n`)
- New exercise types: add a plugin under `lib/exercises/plugins/<type>/` with `schema + evaluator + Renderer`, register in `lib/exercises/registry.ts`, and add seed templates
- No secrets in commits — `.env` is gitignored; use `.env.example` for new vars

---

## 📄 License & Free Tier

- No paid services required. The app runs fully on **free tiers**: Supabase (free Postgres + Auth), Vercel (Hobby), and mock AI tutor.
- Add `OPENROUTER_API_KEY` to enable real AI with free models (e.g. `meta-llama/llama-3.1-8b:free`) — no card required on OpenRouter for free tier.
- No license file yet — treat as private/portfolio unless a `LICENSE` is added.

---

<div align="center">

**Built with ❤️ for learners who want to go from A1 to C2 — one lesson at a time.**

[⬆ Back to top](#-english-learning-platform)

</div>
