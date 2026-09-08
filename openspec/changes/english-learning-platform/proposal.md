# Proposal: English Learning Platform

> **Change ID:** `english-learning-platform` · **Phase:** proposal · **Date:** 2026-09-08 · **Store:** hybrid (file + engram `sdd/english-learning-platform/proposal`) · **Depends on:** `explore.md`

## 1. Change Intent

Build a **universal, 100% self-study English platform** for **kids, adults, seniors, conversational, certification Academy, and school children** covering **general + professional + academic English**, strict **CEFR A1-C2**, guided entirely by a **virtual AI tutor**. Zero paid services (generous free tiers), 5 initial users, easily scalable, future monetization ready (paywall placeholders). The platform must ship as a **mobile-first, dark-mode, PWA (offline reviews), bilingual ES/EN** experience on **Next.js 15 + TypeScript strict + Tailwind 4 + Supabase Postgres + Prisma/supabase-js + Supabase Auth + Vercel + GitHub**.

**Why now:** This is a greenfield product. The proposal freezes scope, slice order, and architecture constraints so that specs/design/tasks can be executed without re-litigating stack or product decisions.

## 2. Scope

### 2.1 In Scope

| Domain | In Scope |
|--------|----------|
| **Audience & Offer** | Universal self-study (all personas via same content, progressive disclosure — not persona-branched content in v1) |
| **CEFR** | Strict A1-C2 (6 levels), hierarchical content (Level → Unit → Lesson → Exercise), navigation toggle linear/free (persisted), optional diagnostic placement test |
| **Skills** | Grammar, vocabulary, listening, reading, writing, speaking (strongest focus) — all 6 required |
| **Exercise types (13)** | fill-blanks, ordering, transformation, flashcards w/ images, matching, audio/TTS, dictation, comprehension Q&A, graded readings, open writing (AI correction), speaking: record, shadowing, pronunciation scoring. Hybrid bank (curated + generative AI) |
| **Review** | Spaced repetition SM-2 (Anki-like), daily reviews, manual topic review — all **optional per user** |
| **Challenges** | Daily, weekly, timed, streak, competitive — all types |
| **Evaluations** | Quiz per lesson + final exam per level; **no official certificate** (informal achievement badges); progression **unlocked by default**, optional locked mode (must pass to advance) per settings |
| **Gamification** | XP, levels, streaks, badges, leaderboard (weekly/all-time), shop/avatar store (cosmetic, XP currency), email notifications (Resend/Supabase free) |
| **Roles & Auth** | Student + Admin only (no teachers). Mandatory email+password (Supabase Auth). Minimal PII: name, email, dob, gender optional |
| **Content** | No owned content — generate initial bank from scratch for A1-C2; easy iteration via admin CRUD |
| **i18n** | ES/EN toggle fully user-switchable, easy to modify (next-intl, JSON namespaces) |
| **Tech** | Next.js 15 App Router, TS strict, Tailwind 4, Supabase Postgres free, Prisma + supabase-js, Supabase Auth, PWA (Serwist), Vercel, GitHub via gh cli, Zustand 5, Zod 4, Vercel AI SDK 5 |
| **Cross-cutting** | PWA offline (reviews), dark mode, mobile-first responsive, RLS, accessibility (granular slices), paywall placeholders |
| **Slices** | Slice 1 = A1-A2 core + full exercise types + evaluations; Slice 2 = B1-B2 + challenges + SRS; Slice 3 = C1-C2 + speaking advanced + admin + polish (see §5) |

### 2.2 Out of Scope (Non-Scope)

| Item | Reason | Future? |
|------|--------|---------|
| Official certificates / proctored exams | Requires accreditation; out of free-tier scope | Possible monetized add-on with third-party issuer |
| Real teachers / live classes / video calls | Contradicts 100% self-study + student+admin only | No — tutor remains virtual |
| Native mobile apps (iOS/Android wrappers) | PWA covers offline + install; native is separate effort | Capacitor/Tauri if demand |
| Owned/purchased content licensing | Discovery states NO owned content; bank generated from scratch | Re-evaluate if quality needs licensed readings |
| Paid AI / paid STT/TTS / paid email | Violates zero-paid constraint | Paywall placeholders allow monetization later |
| Payment processing / subscriptions | Future monetization ready but not implemented | Stripe placeholder routes only |
| Advanced analytics / event warehouse | Supabase free + Vercel Analytics sufficient at 5 users | Post-scale |
| Social features (friends, messaging) | Scope creep for universal audience v1 | Defer |

### 2.3 Explicitly Not Building

- No role `teacher`; no teacher dashboard.
- No mandatory placement test; no mandatory SRS.
- No `SQLite` — replaced by Supabase Postgres (per discovery correction).
- No official certificate generation or PDF issuance.

## 3. Approach

### 3.1 Architecture Approach (High-Level)

- **Modular monolith** (Next.js App Router route groups: `(auth)`, `(app)`, `(admin)`, `(api)`).
- **Prisma** for domain models + migrations + typed DAL; **supabase-js** for Auth/Storage/Realtime.
- **Exercise engine as plugin registry** (strategy pattern) — each exercise type registers a renderer + evaluator + Zod schema; new types are additive.
- **Speaking as provider-abstracted service** (`SpeakingService` interface → `WebSpeechAdapter` primary, `MockAdapter` fallback, future `WasmAdapter`).
- **Tutor AI as provider-abstracted service** (`TutorProvider` interface + `ProviderRouter` → OpenRouter primary / Groq fallback via Vercel AI SDK 5, cached, rate-limited).
- **SRS as SM-2 service** with `srs_cards` + `srs_reviews`; IndexedDB mirror for offline.
- **Gamification as event-driven service** (on `attempt.completed`, `streak.tick`, etc. → XP, badges, leaderboard).
- **PWA via Serwist** with layered caching (app shell cache-first, content network-first, SRS offline-first).
- **i18n via next-intl** (middleware + JSON namespaces, locale persisted in `user_preferences` + cookie).

### 3.2 Data & Content Approach

- Schema-first: Prisma schema drives Supabase Postgres; RLS policies enforce `auth.uid() = user_id` for user data, public read for catalog.
- Seed from scratch: script in `prisma/seed.ts` + `scripts/generate-bank/` that emits ~3.2k exercises (templates + LLM-assisted) validated by Zod per type. No fixture import from owned content.
- Admin CRUD (Slice 3) closes the loop for non-dev content iteration.

### 3.3 Delivery Approach

- **Hybrid artifact store** (file + engram) — satisfies manual SDD requirement.
- **Slices are the PR chain** — each slice is independently deployable; sub-slices keep PRs < 400 lines / tasks < 100 lines.
- **Vercel preview per PR** + GitHub `gh` CLI.
- **No TDD enforcement** per `config.yaml`; tests via Vitest/Playwright where slice adds logic (exercise evaluators, SRS, gamification).

## 4. Alternatives Considered

| Decision | Chosen | Alternative | Why Rejected |
|----------|--------|-------------|--------------|
| DB ORM | Prisma + supabase-js hybrid | supabase-js only / Drizzle | Prisma gives migrations + strict types; Drizzle viable but smaller ecosystem; supabase-js alone loses migration DX |
| PWA | Serwist | next-pwa classic / custom Workbox | Serwist is maintained Workbox successor; next-pwa maintenance slowed |
| i18n | next-intl | next-i18next | next-intl is App Router-first; i18next is pages-legacy |
| Speech | Web Speech API primary | Cloud STT / WASM whisper | Cloud is paid; WASM heavy for Slice 1; abstraction allows future swap |
| AI provider | OpenRouter (primary) + Groq (fallback) via Vercel AI SDK | Direct OpenAI/Anthropic | No free tier; OpenRouter aggregates free models |
| SRS | SM-2 | FSRS / Leitner | SM-2 proven, simple; FSRS deferred until data justifies |
| Auth | Supabase Auth | NextAuth | Supabase Auth natively integrates with RLS + free 50k MAU |
| State | Zustand 5 (or Context) | Redux | Redux overkill at this scale; Zustand minimal |

## 5. Slice Strategy (Auto-Chain)

Slices are **granular and accessible**, agreed order. Each slice is a shippable increment with its own migrations, seed, UI, and deploy. Sub-slices keep changes reviewable.

### Slice 1 — A1-A2 Core + Full Exercise Types + Evaluations (Foundation)

**Goal:** Prove the learning loop end-to-end for the two beginner levels.

**Includes:**
- Project bootstrap (Next.js 15, TS strict, Tailwind 4, ESLint/Prettier, next-intl ES/EN, dark mode, responsive layout)
- Supabase + Prisma setup, initial migrations (`User`, `Level`, `Unit`, `Lesson`, `Exercise`, `Attempt`, `Progress`), RLS, seed for A1-A2 (~1,024 exercises) + placement test stubs
- Supabase Auth (email+password, mandatory), minimal PII, `user_preferences` (navigation_mode, progression_mode, locale)
- CEFR navigation: Level → Unit → Lesson → Exercise; toggle linear/free (persisted)
- **All 13 exercise types** at minimal viable fidelity (each type renders, evaluates, persists attempt) — vocabulary + grammar + listening + reading + writing + speaking baseline
- Speaking baseline: `SpeakingService` + `WebSpeechAdapter` (record, TTS, heuristic scoring) + fallback for unsupported browsers
- Tutor baseline: `TutorProvider` abstraction + `MockProvider` + OpenRouter wiring (feature-flagged), writing correction hook
- Evaluations: quiz per lesson + final exam per level (A1, A2); informal badges (no certificate); progression unlocked default + toggle to locked
- Gamification baseline: XP, levels, streaks, badges (rule engine), shop stub (read-only catalog)
- PWA stub (manifest + Serwist install) — offline not yet full

**Exit criteria:** User can register, pick A1, complete any exercise type, take quizzes/exams, see XP/streaks/badges, toggle navigation/progression/locale — all on A1-A2 content, deployed to Vercel.

**Estimated effort:** 4-6 sub-slices, ~35-45 tasks (see `tasks.md`).

### Slice 2 — B1-B2 + Challenges + SRS + Leaderboard

**Goal:** Intermediate levels with retention and engagement loops.

**Includes:**
- B1-B2 content seed (~1,280 exercises) + graded readings expansion
- **Challenges:** daily, weekly, timed, streak, competitive (all types) — `challenges` + `challenge_participants` + scheduler
- **SRS:** SM-2 engine (`srs_cards`, `srs_reviews`), daily reviews, manual topic review (all optional), IndexedDB mirror, email digests via Resend/Supabase
- Leaderboard (weekly + all-time, cached)
- Gamification polish: shop purchases (XP currency), avatar store, notifications
- i18n content polish; PWA caching for reviews

**Exit criteria:** B1-B2 browsable; SRS cards generated from attempts; challenges enrollable and completable; leaderboard live; daily review emails (if opted in).

**Dependencies:** Slice 1 (core models, exercise engine, gamification baseline).

### Slice 3 — C1-C2 + Speaking Advanced + Admin + Polish

**Goal:** Complete CEFR, harden speaking, enable non-dev content ops, prepare monetization.

**Includes:**
- C1-C2 content (~960 exercises, academic/professional + long-form readings)
- Speaking advanced: shadowing variants, pronunciation scoring polish, transcript diff UI, optional WASM path spike
- Informal certificates → **achievement badges** (replaces official cert) with shareable badge page
- **Admin panel** (role `admin` only): CRUD for Levels/Units/Lessons/Exercises/Challenges/Badges/Shop items, user management (read-only PII), moderation, seed re-run, RLS enforcement
- PWA offline polish (full reviews offline, background sync, offline indicator)
- Paywall placeholders (route guards + UI stubs for future Stripe)
- Accessibility audit, performance audit (Lighthouse), scaling notes for beyond free tier

**Exit criteria:** Full A1-C2 navigable; admin can CRUD content without code; speaking advanced usable; PWA offline reviews work; paywall placeholders in place; ready to scale beyond 5 users.

**Dependencies:** Slice 1 + Slice 2.

### Chained PR Guidance

```
main
 └─ slice1/bootstrap ── slice1/auth-cefr ── slice1/exercise-engine ── slice1/evaluations ── slice1/gamification-baseline
                                              └─ slice2/b1-b2-content ── slice2/challenges ── slice2/srs ── slice2/leaderboard
                                                                                              └─ slice3/c1-c2 ── slice3/speaking-advanced ── slice3/admin ── slice3/polish
```

- Each PR < 400 lines; each task < 100 lines (see `tasks.md`).
- Vercel preview per PR; squash-merge with conventional commits.

## 6. Risks

| # | Risk | Mitigation | Owner |
|---|------|------------|-------|
| R1 | AI free-tier rate limits break tutor/generation | Provider router + fallbacks + cache + per-user rate limits + template-first + pre-batch seeds | Slice 1 |
| R2 | Content volume/quality (3.2k exercises from scratch) | Slice content; templates per type; Zod validation; admin CRUD for iteration; LLM-assisted + human review | All slices |
| R3 | Web Speech support gaps | Abstraction + `isSupported()` + typed fallback + future WASM path | Slice 1 + 3 |
| R4 | Supabase free quotas (500MB, 1GB storage, bandwidth) | No audio persistence, image optimization, AI caching, monitoring, upgrade path documented | All slices |
| R5 | Scope creep (universal audience) | Content is CEFR-driven, not persona-branched; personas are filters, not forks | Proposal (this doc) |
| R6 | PWA offline conflicts | IndexedDB + background sync + reconciliation | Slice 2-3 |
| R7 | Gamification abuse | Server-side scoring, idempotency, rate limits | Slice 1-2 |

## 7. Success Criteria

| # | Criterion | Measurable |
|---|-----------|------------|
| S1 | A learner can register and complete any exercise type on A1 within 5 minutes of first visit | E2E Playwright: register → A1 lesson → 13 types rendered |
| S2 | CEFR navigation toggle persists per user and respects RLS | Integration test: set `navigation_mode` → reload → assert |
| S3 | Speaking works on Chrome/Edge via Web Speech; degrades gracefully on unsupported browsers | Manual QA matrix + `isSupported()` test |
| S4 | Tutor abstraction can swap OpenRouter ↔ Groq via env without code change | Config test: env switch → chat still resolves |
| S5 | Evaluations (lesson quiz + level exam) persist attempts and gate progression when locked | Test: locked mode blocks advance until pass ≥ threshold |
| S6 | SRS daily reviews surface due cards; manual review filters by topic | Test: card due yesterday appears in daily queue |
| S7 | Free-tier quotas not exceeded at 5 users with full A1-C2 content | Supabase dashboard: DB < 100MB, MAU ≤ 5, storage < 200MB |
| S8 | PWA installs and serves reviews offline | Lighthouse PWA 90+, offline review e2e |
| S9 | Admin can CRUD an exercise without code deploy | E2E: admin creates exercise → student sees it |
| S10 | All slices deployed to Vercel via `gh` with previews | `gh pr view` + Vercel deployment URL per slice |

## 8. Affected Modules / Packages (per config.yaml rule)

- `app/` (route groups, layouts, middleware for i18n/auth)
- `prisma/` (schema, migrations, seed)
- `lib/supabase/` (client, RLS helpers)
- `lib/ai/` (tutor provider abstraction, Vercel AI SDK)
- `lib/speech/` (SpeakingService + adapters)
- `lib/srs/` (SM-2 engine)
- `lib/gamification/` (XP, streaks, badges, leaderboard)
- `lib/i18n/` (next-intl)
- `components/` (exercise renderers, CEFR nav, gamification UI, PWA)
- `public/` (PWA manifest, icons)
- `scripts/` (bank generation)

## 9. Rollback Plan (per config.yaml rule)

- **Before Slice 1 merge:** No production data — full revert via `git revert` + Supabase branch reset.
- **After Slice 1 deploys:** Migrations are additive and reversible (Prisma `down` SQL kept in repo). Content seeds are idempotent (upsert by natural key). RLS changes are additive.
- **AI/Speech:** Provider switches are env-only — rollback is env revert, no migration.
- **PWA:** Service worker versioned; rollback is redeploy previous build (Vercel instant rollback).
- **Data:** Nightly `pg_dump` of Supabase (via GitHub Action) stored as artifact; restore to branch for verification before prod restore.

## 10. Next Steps

- `spec.md` — delta specs with FR-xxx + Given/When/Then for every in-scope domain.
- `design.md` — architecture, Supabase schema + RLS, exercise engine plugin, speaking/tutor abstractions, SRS SM-2, gamification, PWA, i18n, auth flow, deployment.
- `tasks.md` — granular tasks grouped by slice, each < 100 lines, with dependencies and PR chain.
