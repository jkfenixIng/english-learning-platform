# Tasks: English Learning Platform

> **Change ID:** `english-learning-platform` · **Phase:** tasks · **Date:** 2026-09-08 · **Store:** hybrid (file + engram `sdd/english-learning-platform/tasks`) · **Depends on:** `spec.md` + `design.md` · **Convention:** Hierarchical numbering, grouped by slice, each task < 100 lines changed, dependencies noted

## Conventions

- **ID format:** `T-{SLICE}-{DOMAIN}-{NN}` (e.g., `T-1-SETUP-01`, `T-1-EX-03`).
- **Slice 1 = A1-A2 core** (foundation), **Slice 2 = B1-B2 + challenges + SRS**, **Slice 3 = C1-C2 + speaking advanced + admin + polish**.
- **Effort:** S=≤30 lines, M=30-60, L=60-100 (target <100; L tasks are split if they risk overflow).
- **PR grouping:** See §4 Review Workload Forecast and chained PR map.
- **Tracer:** Each task lists `Spec` FRs it satisfies.

---

## Slice 0 — Project Bootstrap (Cross-Slice Setup)

> Must land first. No feature slice can start without T-0-SETUP-*.

| ID | Title | Description | Acceptance Criteria | Files to Create/Modify | Lines | Spec | Depends On |
|----|-------|-------------|---------------------|------------------------|-------|------|------------|
| T-0-SETUP-01 | Init Next.js 15 + TS strict + Tailwind 4 | Scaffold `create-next-app` with App Router, TS `strict:true`, Tailwind 4 (`@tailwindcss/postcss`), ESLint+Prettier, `cn()` helper | `npm run build` passes; `cn('p-2','p-4')` dedupes; no `var()` in className | `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `lib/utils/cn.ts`, `app/layout.tsx`, `app/globals.css` | M | NFR-02 | — |
| T-0-SETUP-02 | Configure Supabase + Prisma | Add `supabase-js`, `prisma`, `DATABASE_URL`; `prisma init` with Postgres; `prisma/schema.prisma` skeleton (User, Level); `lib/supabase/client.ts` + `server.ts` | `npx prisma validate` passes; `supabase-js` can `auth.getUser()` (mock); env template committed as `.env.example` | `prisma/schema.prisma`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `.env.example` | M | FR-AUTH-* | T-0-SETUP-01 |
| T-0-SETUP-03 | Configure next-intl (ES/EN) | Install `next-intl`, add `middleware.ts` (locale detection), `messages/en,es/common.json`, `lib/i18n/request.ts`, locale toggle stub | `/en` and `/es` routes render; missing key falls back to `en` | `middleware.ts`, `lib/i18n/request.ts`, `messages/en/common.json`, `messages/es/common.json`, `next.config.js` (with next-intl plugin) | M | FR-I18N-* | T-0-SETUP-01 |
| T-0-SETUP-04 | Configure Zustand + Zod + Vercel AI SDK stubs | Install `zustand`, `zod`, `ai`, `@ai-sdk/openai`; create `lib/stores/preferences.ts` (nav/locale/theme), `lib/validation/common.ts` | Store persists to localStorage; Zod validates sample; `ai` import doesn't break build | `lib/stores/preferences.ts`, `lib/validation/common.ts`, `lib/ai/provider.ts` (interface only) | S | FR-CEFR-02, FR-TUTOR-02 | T-0-SETUP-01 |
| T-0-SETUP-05 | Configure PWA manifest + Serwist stub | Add `serwist` (or `next-pwa` fallback), `public/manifest.json`, icons placeholders, `app/sw.ts` stub, `next.config.js` PWA plugin | Lighthouse PWA checklist shows manifest; `npm run build` emits `public/sw.js` | `public/manifest.json`, `public/icons/*`, `app/sw.ts`, `next.config.js` (serwist) | S | FR-PWA-01 | T-0-SETUP-01 |
| T-0-SETUP-06 | Add GitHub + Vercel wiring | `gh` remote check, `.github/workflows/ci.yml` (lint, typecheck, build), `vercel.json` stub | `gh repo view` shows remote; CI runs on PR | `.github/workflows/ci.yml`, `vercel.json` | S | — | T-0-SETUP-01 |
| T-0-SETUP-07 | Seed script harness (idempotent) | `prisma/seed.ts` with upsert helpers, `scripts/check-i18n.ts` (missing keys), `scripts/generate-bank/README.md` | `npm run seed` is idempotent (rerun = no dupes) | `prisma/seed.ts`, `scripts/check-i18n.ts`, `package.json` scripts | S | FR-ADMIN-04 | T-0-SETUP-02 |

---

## Slice 1 — A1-A2 Core + Full Exercise Types + Evaluations (Foundation)

> **Goal:** Prove learning loop for beginner levels. **Exit:** A1-A2 browsable, 13 types rendered, quizzes/exams, XP/streaks/badges baseline, tutor mock, speaking baseline, deployed to Vercel.

### 1A. Auth & User

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-AUTH-01 | Supabase Auth email+password — register | Build `(auth)/register/page.tsx` + Server Action `register` (Supabase `signUp`, insert `User` row, set `role=student`) | Valid form → user in `auth.users` + `User` table; duplicate email → locale error (S-AUTH-01) | `app/(auth)/register/page.tsx`, `app/(auth)/register/actions.ts`, `lib/validation/auth.ts` | M | FR-AUTH-01, 02 | T-0-SETUP-02 |
| T-1-AUTH-02 | Login + middleware guard | `login/page.tsx` + `signIn`, `middleware.ts` auth gate for `/app/*` and `/admin/*`, password reset page | Unauth `/app/*` → redirect `/login`; login → `/dashboard` (S-AUTH-02) | `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`, `middleware.ts` (auth branch) | M | FR-AUTH-01, 05 | T-1-AUTH-01 |
| T-1-AUTH-03 | UserPreferences (nav/progression/locale/theme) | Prisma `UserPreferences` model + migration + `lib/stores/preferences.ts` sync to DB + Server Actions `updatePreferences` | Toggle in `/settings` persists to DB and survives reload (S-CEFR-01) | `prisma/schema.prisma` (UserPreferences), `prisma/migrations/*`, `app/(app)/settings/page.tsx` (prefs section), `lib/dal/preferences.ts` | M | FR-CEFR-02,03, FR-I18N-01 | T-1-AUTH-02 |
| T-1-AUTH-04 | RLS policies + tests | Migration adding RLS for `User`, `Attempt`, `Progress`, `UserPreferences` + integration test (owner isolation, public read) | Test: A cannot read B's attempts (S-AUTH-03); public catalog readable | `prisma/migrations/*_rls.sql`, `tests/rls.test.ts` (Vitest) | M | FR-AUTH-04 | T-0-SETUP-02 |

### 1B. CEFR Catalog & Navigation

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-CEFR-01 | Prisma models Level/Unit/Lesson/Exercise | Add `Level`, `Unit`, `Lesson`, `Exercise` models + `order_index` uniques + migration | `npx prisma migrate dev` succeeds; `order_index` unique per parent enforced | `prisma/schema.prisma`, `prisma/migrations/*` | S | FR-CEFR-01,05 | T-0-SETUP-02 |
| T-1-CEFR-02 | Seed A1-A2 catalog (levels/units/lessons) | `prisma/seed.ts`: 2 levels (A1,A2) ×8 units ×8 lessons, titles/objectives, `estimated_minutes` | `npm run seed` creates 2×8×8=128 lessons; rerun idempotent | `prisma/seed.ts`, `scripts/generate-bank/seed-a1-a2.ts` | M | FR-CEFR-01 | T-1-CEFR-01 |
| T-1-CEFR-03 | Level→Unit→Lesson browsing UI (free mode) | `app/(app)/levels/[code]/page.tsx`, `units/[id]/page.tsx`, `lessons/[id]/page.tsx` (Server Components, Prisma DAL) | Free mode shows grid/catalog; data from DB (S-CEFR-03) | `app/(app)/levels/[code]/page.tsx`, `app/(app)/units/[id]/page.tsx`, `app/(app)/lessons/[id]/page.tsx`, `lib/dal/levels.ts` | M | FR-CEFR-05 | T-1-CEFR-02 |
| T-1-CEFR-04 | Linear mode + progression guard | Client toggle + `navigation_mode` guard: linear renders prev/next; `progression_mode=locked` blocks unlocked lessons (S-CEFR-04) | Linear shows sequential nav; locked blocks advance until pass threshold 70 | `components/cefr/NavigationToggle.tsx`, `lib/dal/progression.ts`, `app/(app)/lessons/[id]/client.tsx` | M | FR-CEFR-02,03,06 | T-1-CEFR-03, T-1-AUTH-03 |
| T-1-CEFR-05 | Placement test (optional) — models + UI | `PlacementTest/Question/Attempt` models + `/placement` flow (start → Q&A → score → recommended level CTA) | Non-mandatory; result recommends level, no auto-enroll (S-CEFR-02) | `prisma/schema.prisma` (placement), `app/(app)/placement/page.tsx`, `app/api/placement/attempt/route.ts` | M | FR-CEFR-04 | T-1-CEFR-01 |
| T-1-CEFR-06 | Dark mode + responsive polish | Tailwind dark variant, `theme` in `UserPreferences`, `ThemeToggle`, mobile-first layout audit | Toggle persists; `prefers-color-scheme` respected on first load | `app/layout.tsx`, `components/ui/ThemeToggle.tsx`, `lib/stores/preferences.ts` | S | FR-PWA-04 | T-1-AUTH-03 |

### 1C. Exercise Engine (Plugin Architecture)

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-EX-01 | Registry + types + validator harness | `lib/exercises/registry.ts`, `types.ts`, `EvaluationResult`, Zod harness, `getPlugin` + unit test for isolation (S-EX-03) | Register mock plugin → evaluate → registry returns it; adding new type doesn't break existing | `lib/exercises/registry.ts`, `lib/exercises/types.ts`, `tests/exercises-registry.test.ts` | M | FR-EX-02,05 | T-0-SETUP-04 |
| T-1-EX-02 | Prisma Attempt + Progress models | `Attempt` + `Progress` models + Server Action `submitAttempt` (validate, evaluate, persist, update Progress) | Submit → `Attempt` row + `Progress.bestScore` updated (S-EX-01) | `prisma/schema.prisma` (Attempt, Progress), `app/api/exercises/[id]/attempt/route.ts` or `actions.ts` | M | FR-EX-03 | T-1-CEFR-01, T-1-EX-01 |
| T-1-EX-03 | Plugin: fill_blanks | `plugins/fill-blanks/{schema,evaluator,Renderer,index}` | “She ___ (go)” → “went” scores 100 (S-EX-01) | `lib/exercises/plugins/fill-blanks/*` (4 files) | M | FR-EX-01 | T-1-EX-01 |
| T-1-EX-04 | Plugin: ordering | Tokens drag/drop or click-to-order; evaluator compares sequence | Correct order 100, partial with diff | `lib/exercises/plugins/ordering/*` | M | FR-EX-01 | T-1-EX-01 |
| T-1-EX-05 | Plugin: transformation | Rephrase task; evaluator checks canonical transforms (multiple accepted) | “Make passive” → accepted variants pass | `lib/exercises/plugins/transformation/*` | M | FR-EX-01 | T-1-EX-01 |
| T-1-EX-06 | Plugin: flashcard (with images) | Front/back, image asset, flip animation; evaluator is reveal (self-graded) or auto if typed | Image loads via `next/image`; flip works on mobile | `lib/exercises/plugins/flashcard/*`, `components/exercises/Flashcard.tsx` | M | FR-EX-01 | T-1-EX-01 |
| T-1-EX-07 | Plugin: matching | Pairs (word↔definition, image↔word); drag or click matching | All pairs correct → 100 | `lib/exercises/plugins/matching/*` | M | FR-EX-01 | T-1-EX-01 |
| T-1-EX-08 | Plugin: listening_tts + TTS service | `speechSynthesis` wrapper `lib/speech/tts.ts`; `listening_tts` Renderer with play/replay/speed, voice select | Play speaks text; speed 0.75/1/1.25 works (S-LST-01) | `lib/speech/tts.ts`, `lib/exercises/plugins/listening-tts/*` | M | FR-LST-01,02,03 | T-1-EX-01 |
| T-1-EX-09 | Plugin: dictation | Plays TTS once, input for transcription, evaluator = WER-tolerant | Dictation scored with tolerance for punctuation/case | `lib/exercises/plugins/dictation/*` | M | FR-LST-01,02 | T-1-EX-08 |
| T-1-EX-10 | Plugin: comprehension + graded_reading | Passage display + Q&A; `graded_reading` with vocab highlights linked to flashcards | Reading + 5 Qs → per-Q score + overall (S-READ-01) | `lib/exercises/plugins/comprehension/*`, `lib/exercises/plugins/graded-reading/*`, `components/exercises/ReadingPassage.tsx` | M | FR-READ-01,02 | T-1-EX-01 |
| T-1-EX-11 | Plugin: writing_prompt (AI hook) | Prompt + textarea + submit → `/api/ai/correct` (mock in Slice 1) → annotated feedback | Writing correction returns score + annotations (S-WRITE-01, mocked) | `lib/exercises/plugins/writing-prompt/*`, `app/api/ai/correct/route.ts` (mock) | M | FR-WRITE-01,02 | T-1-EX-01 |

### 1D. Speaking Baseline (Strongest Focus)

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-SPEAK-01 | SpeakingService interface + MockAdapter | `lib/speech/types.ts`, `SpeakingService` interface, `MockAdapter` (deterministic transcript) + `isSupported()` | Tests use MockAdapter; `isSupported()` reflects `window.SpeechRecognition` | `lib/speech/types.ts`, `lib/speech/mock-adapter.ts`, `lib/speech/index.ts` | S | FR-SPEAK-01,03 | T-0-SETUP-04 |
| T-1-SPEAK-02 | WebSpeechAdapter (record + transcribe + TTS) | Wrap `SpeechRecognition` + `speechSynthesis`; `startRecording`/`stopRecording` → transcript + confidence | Chrome: record → transcript appears; denied mic → guidance (S-SPEAK-03) | `lib/speech/web-speech-adapter.ts` | M | FR-SPEAK-01,02,04 | T-1-SPEAK-01 |
| T-1-SPEAK-03 | Pronunciation scoring (heuristic) | `scorePronunciation(ref, transcript)` → `PronunciationScore` (WER + per-word) | “Could you elaborate?” vs transcript → word diff + overall 0-100 (FR-SPEAK-05) | `lib/speech/scoring.ts`, `tests/speech-scoring.test.ts` | M | FR-SPEAK-05 | T-1-SPEAK-01 |
| T-1-SPEAK-04 | Plugins: speaking_record, shadowing, pronunciation | Three renderers using `SpeakingService`; `shadowing` plays ref then records; `pronunciation` shows diff UI | Happy path Chrome (S-SPEAK-01) + fallback on unsupported (S-SPEAK-02) | `lib/exercises/plugins/speaking-record/*`, `lib/exercises/plugins/shadowing/*`, `lib/exercises/plugins/pronunciation/*`, `components/speech/*` | L (split if >100) | FR-SPEAK-02,03,06 | T-1-SPEAK-02, T-1-SPEAK-03 |
| T-1-SPEAK-05 | Audio transient handling (no persistence default) | Store blobs in memory/IndexedDB only; optional opt-in upload flag in `UserPreferences` → Supabase Storage | Default: no `storage` upload; opt-in toggle exists but off | `lib/speech/audio-store.ts`, `app/(app)/settings/page.tsx` (audio toggle) | S | FR-SPEAK-06 | T-1-SPEAK-02 |

### 1E. Tutor Baseline

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-TUTOR-01 | TutorProvider abstraction + ProviderRouter | `TutorProvider` interface, `ProviderRouter` (primary→fallback→cache), `MockProvider` | Swapping `AI_PROVIDER` env changes provider without code (S-TUTOR-01 fallback) | `lib/ai/provider.ts`, `lib/ai/router.ts`, `lib/ai/providers/mock.ts`, `lib/ai/cache.ts` | M | FR-TUTOR-02,03,04 | T-0-SETUP-04 |
| T-1-TUTOR-02 | OpenRouter + Groq adapters (Vercel AI SDK) | `openrouter.ts` + `groq.ts` via `ai` SDK `generateText`/`streamText`; rate-limit bucket `lib/ai/rate-limit.ts` | `/api/ai/chat` streams from OpenRouter; 429 → Groq; rate limit 20/day per user | `lib/ai/providers/openrouter.ts`, `lib/ai/providers/groq.ts`, `lib/ai/rate-limit.ts`, `app/api/ai/chat/route.ts` | M | FR-TUTOR-02,03,04 | T-1-TUTOR-01 |
| T-1-TUTOR-03 | Tutor UI (floating + page) | Floating `TutorWidget` + `/tutor` page, chat input, markdown render, optimistic UI | Student asks “past perfect” → reply streamed, cached, rate-limited (S-TUTOR-01) | `components/tutor/TutorWidget.tsx`, `components/tutor/ChatMessage.tsx`, `app/(app)/tutor/page.tsx` | M | FR-TUTOR-01,05 | T-1-TUTOR-02 |
| T-1-TUTOR-04 | Generative exercises (template-first) | `TutorProvider.generateExercise` + `app/api/ai/generate-exercise/route.ts`; template fallback when AI down (S-EX-04) | “Generate B1 vocab” → cached generative exercise with `aiGenerated=true` or template fallback | `app/api/ai/generate-exercise/route.ts`, `lib/ai/exercise-generator.ts` | S | FR-EX-04 | T-1-TUTOR-02 |

### 1F. Evaluations

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-EVAL-01 | Lesson quiz + Level exam models + logic | `Quiz`/`Exam` as special `Lesson` type or `evaluations` table; threshold 70; attempt scoring; badge award stub | Quiz per lesson + exam per level (S-EVAL-01) | `prisma/schema.prisma` (evaluation or flag on Lesson), `lib/dal/evaluations.ts`, `app/(app)/lessons/[id]/quiz/page.tsx` | M | FR-EVAL-01,03,04 | T-1-CEFR-01 |
| T-1-EVAL-02 | Evaluation UI + progression gating | Quiz/Exam Renderer (timer optional), result page, badge award on pass (informal, no certificate) | Pass 82 → badge earned; locked mode blocks next unit until 70 | `components/evaluations/QuizRunner.tsx`, `lib/gamification/badges.ts` (level badges) | M | FR-EVAL-02,03 | T-1-EVAL-01 |
| T-1-EVAL-03 | Seed A1-A2 quizzes/exams | Generate 16 lesson quizzes + 2 level exams (A1,A2) in seed | Each lesson has quiz; each level has exam | `scripts/generate-bank/seed-quizzes.ts`, `prisma/seed.ts` | S | FR-EVAL-01 | T-1-EVAL-01 |

### 1G. Gamification Baseline

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-GAME-01 | XP + streaks + levels | `UserStreak` model + `lib/gamification/xp.ts` (`computeXp`) + `streak.ts`; `onAttemptCompleted` hook | Submit attempt → XP computed server-side, streak updated (S-GAME-01) | `prisma/schema.prisma` (UserStreak), `lib/gamification/xp.ts`, `lib/gamification/streak.ts`, `tests/gamification-xp.test.ts` | M | FR-GAME-01,02 | T-1-EX-02 |
| T-1-GAME-02 | Badges (rule engine) | `Badge`, `UserBadge` models + `lib/gamification/badges.ts` (predicates) + evaluation on attempt/level pass | Pass A1 exam → `badge_a1_complete` awarded (S-EVAL-01) | `prisma/schema.prisma` (Badge, UserBadge), `lib/gamification/badges.ts` | M | FR-GAME-03 | T-1-GAME-01 |
| T-1-GAME-03 | Gamification UI (XP bar, streak flame, badge grid) + shop stub | `components/gamification/*` (XpBar, StreakIndicator, BadgeGrid), `/shop` read-only catalog | Dashboard shows XP/level/streak/badges; shop lists items (no purchase yet) | `components/gamification/XpBar.tsx`, `components/gamification/StreakIndicator.tsx`, `components/gamification/BadgeGrid.tsx`, `app/(app)/shop/page.tsx` | M | FR-GAME-01,02,03,05 | T-1-GAME-01 |
| T-1-GAME-04 | Seed A1-A2 gamification (10 badges, 8 shop items) | Badges `streak_7`, `a1_complete`, etc.; 8 cosmetic shop items | Badges evaluable; shop catalog visible | `prisma/seed.ts` (badges, shop), `scripts/generate-bank/seed-gamification.ts` | S | FR-GAME-03,05 | T-1-GAME-02 |

### 1H. Seed Content — Exercises A1-A2

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-SEED-01 | Generate A1 exercises (~512) | `scripts/generate-bank/generate-exercises.ts` templates per type for A1; Zod validate; upsert | 512 exercises across 13 types, all validated, browsable | `scripts/generate-bank/generate-exercises.ts`, `scripts/generate-bank/templates/*`, `prisma/seed.ts` | L (script) | FR-EX-01,05 | T-1-EX-03..11 |
| T-1-SEED-02 | Generate A2 exercises (~512) | Same for A2 | 512 A2 exercises, validated | Same as above (A2 batch) | L | FR-EX-01 | T-1-SEED-01 |

### 1I. Slice 1 Polish & Deploy

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-1-POLISH-01 | Dashboard + progress overview | `/dashboard` with continue-where-left, recent badges, streak, suggested next lesson | New user sees onboarding + A1 start; returning sees progress | `app/(app)/dashboard/page.tsx`, `lib/dal/progress.ts` | M | FR-CEFR-05, FR-GAME-* | T-1-CEFR-03, T-1-GAME-03 |
| T-1-POLISH-02 | Error/loading/empty states + a11y pass | Skeletons, error boundaries, WCAG AA for exercise renderers (labels, keyboard) | Axe audit no critical for exercise pages | `components/ui/Skeleton.tsx`, `app/error.tsx`, `tests/a11y-smoke.test.tsx` | S | NFR-03 | All 1A-1H |
| T-1-DEPLOY-01 | Vercel deploy Slice 1 | `gh` PR for Slice 1, Vercel preview, `prisma migrate deploy` on build, env set | Preview URL live; fresh DB seeded; register→A1 exercise→quiz flow works E2E | `vercel.json`, `.github/workflows/ci.yml`, `package.json` build | S | NFR-01 | All 1A-1I |

---

## Slice 2 — B1-B2 + Challenges + SRS + Leaderboard

> **Goal:** Intermediate levels with retention loops. **Depends on:** Slice 1 merged.

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-2-CONTENT-01 | Seed B1 content (~640 exercises) | B1 units/lessons + 640 exercises (harder vocab, longer readings, open writing) | B1 browsable; readings longer than A2 | `scripts/generate-bank/seed-b1.ts`, `prisma/seed.ts` | L | FR-EX-01, FR-READ-01 | Slice 1 |
| T-2-CONTENT-02 | Seed B2 content (~640 exercises) | Same for B2 (professional contexts) | B2 browsable with pro/academic flavor | `scripts/generate-bank/seed-b2.ts` | L | FR-EX-01 | T-2-CONTENT-01 |
| T-2-CONTENT-03 | Seed B1-B2 quizzes/exams | Lesson quizzes + B1/B2 level exams | Each B lesson has quiz; B1/B2 exams with threshold 70 | `scripts/generate-bank/seed-quizzes-b.ts` | S | FR-EVAL-01 | T-2-CONTENT-01 |
| T-2-CHAL-01 | Challenge models + enroll/complete flow | `Challenge`, `ChallengeParticipant` models + migration + `lib/challenges/service.ts` (enroll, progress, complete) | Enroll → progress tracked → complete → reward XP (S-CHAL-01) | `prisma/schema.prisma` (Challenge...), `lib/challenges/service.ts`, `app/api/challenges/[id]/enroll/route.ts` | M | FR-CHAL-01,02 | Slice 1 |
| T-2-CHAL-02 | Challenge types: daily/weekly/timed/streak/competitive | Rule JSON per type + scheduler helper (`lib/challenges/rules.ts`) + cron placeholder (Vercel Cron or manual) | All 5 types creatable; timed respects `end_at`; streak checks `UserStreak` | `lib/challenges/rules.ts`, `scripts/generate-bank/seed-challenges.ts`, `app/(app)/challenges/page.tsx` | M | FR-CHAL-01 | T-2-CHAL-01 |
| T-2-CHAL-03 | Challenges UI (dashboard + list) | `ChallengeCard`, dashboard active challenges, completion celebration | Dashboard shows active challenges; completed shows badge | `components/challenges/ChallengeCard.tsx`, `app/(app)/dashboard/page.tsx` (challenges section) | M | FR-CHAL-03 | T-2-CHAL-02 |
| T-2-SRS-01 | SRS models (SM-2) + review algorithm | `SrsCard`, `SrsReview` models + `lib/srs/sm2.ts` (`review(card, quality)`) + tests for SM-2 | SM-2 intervals correct per spec §7; quality <3 resets repetitions | `prisma/schema.prisma` (Srs*), `lib/srs/sm2.ts`, `tests/srs-sm2.test.ts` | M | FR-SRS-01,03,04 | Slice 1 |
| T-2-SRS-02 | SRS daily queue + manual topic review UI | `/reviews` page: due queue + manual filter by unit/lesson; `srs_enabled` gate (S-SRS-01/02) | Due cards appear ordered; disabled shows gate; manual review filters | `app/(app)/reviews/page.tsx`, `lib/dal/srs.ts`, `components/srs/ReviewCard.tsx` | M | FR-SRS-02,05 | T-2-SRS-01 |
| T-2-SRS-03 | SRS card creation hook + IndexedDB mirror | On `attempt` (flashcard/vocab auto, others opt-in) → `srs_cards`; IndexedDB `lib/srs/indexed-db.ts` (Dexie/idb) | Completing vocab → card created; offline review → sync on reconnect | `lib/srs/hooks.ts`, `lib/srs/indexed-db.ts`, `app/api/srs/review/route.ts` | M | FR-SRS-03,05 | T-2-SRS-01 |
| T-2-GAME-01 | Leaderboard (weekly/all-time, cached) | `LeaderboardCache` + `lib/gamification/leaderboard.ts` (top N, 5-min TTL) + `/leaderboard` page + pagination | Top N by XP, weekly resets Monday, cached 5 min (FR-NOTIF-01) | `prisma/schema.prisma` (LeaderboardCache), `lib/gamification/leaderboard.ts`, `app/(app)/leaderboard/page.tsx`, `app/api/leaderboard/route.ts` | M | FR-GAME-04, FR-NOTIF-01 | Slice 1 |
| T-2-GAME-02 | Shop purchases (XP currency) | `ShopItem`, `UserInventory` + `purchase(itemId)` Server Action (deduct XP, add to inventory) | Purchase with enough XP → inventory updated; insufficient → error | `prisma/schema.prisma` (ShopItem, UserInventory), `lib/gamification/shop.ts`, `app/(app)/shop/page.tsx` (buy button) | M | FR-GAME-05 | T-2-GAME-01 |
| T-2-NOTIF-01 | Email notifications (Resend/Supabase) | `Notification` model + `lib/notifications/email.ts` (Resend free 3k/mo, Supabase Auth email fallback) + opt-in `email_notifications` | Opted-in user receives streak/SRS digest; in-app `notifications` with `read` flag (FR-NOTIF-02,03) | `prisma/schema.prisma` (Notification), `lib/notifications/email.ts`, `app/api/notifications/*` | M | FR-NOTIF-02,03 | T-2-SRS-02 |
| T-2-PWA-01 | PWA offline for reviews (SRS + visited lessons) | Serwist strategies (see design §9); IndexedDB for SRS; offline indicator `useOnlineStatus` + banner; background sync | Offline: reviews still usable; online: sync reconciles (E3) | `app/sw.ts`, `lib/hooks/useOnlineStatus.ts`, `components/pwa/OfflineBanner.tsx`, `next.config.js` (serwist routes) | M | FR-PWA-02,03 | T-2-SRS-03 |
| T-2-I18N-01 | i18n content polish (exercises, gamification) | Fill `messages/en,es/exercises.json`, `gamification.json`, `challenges.json`; `check-i18n` CI | All UI strings covered ES/EN; CI fails on missing keys (E9) | `messages/en,es/*.json`, `scripts/check-i18n.ts` | S | FR-I18N-01,02 | T-0-SETUP-03 |
| T-2-DEPLOY-01 | Vercel deploy Slice 2 | PR for Slice 2, preview, migrations, seed B-level content | Preview: B1-B2 browsable, challenges enrollable, SRS daily queue live | `prisma/migrations/*`, `vercel.json` | S | — | All T-2 |

---

## Slice 3 — C1-C2 + Speaking Advanced + Admin + Polish

> **Goal:** Complete CEFR, harden speaking, enable non-dev content ops, monetization ready. **Depends on:** Slice 1 + 2.

| ID | Title | Description | Acceptance Criteria | Files | Lines | Spec | Depends |
|----|-------|-------------|---------------------|-------|-------|------|---------|
| T-3-CONTENT-01 | Seed C1 content (~480 exercises, academic) | C1 units/lessons + 480 exercises (academic/professional, long-form readings) | C1 browsable with academic tone | `scripts/generate-bank/seed-c1.ts`, `prisma/seed.ts` | L | FR-EX-01, FR-READ-01 | Slice 2 |
| T-3-CONTENT-02 | Seed C2 content (~480, mastery) | C2 units/lessons + 480 exercises (nuance, idioms, professional) | C2 browsable, hardest difficulty 5 | `scripts/generate-bank/seed-c2.ts` | L | FR-EX-01 | T-3-CONTENT-01 |
| T-3-CONTENT-03 | Seed C1-C2 quizzes/exams + informal badges | Level exams C1/C2 + badges `c1_complete`, `c2_master` (no official cert) | Pass C2 → master badge + shareable badge page (FR-EVAL-02) | `scripts/generate-bank/seed-quizzes-c.ts`, `prisma/seed.ts` (badges) | S | FR-EVAL-02 | T-3-CONTENT-01 |
| T-3-SPEAK-01 | Shadowing variants + transcript diff polish | Shadowing with speed variants, highlight per-word diff, retry; `components/speech/TranscriptDiff.tsx` | Word diff shows matched/missed; shadowing retry works | `components/speech/TranscriptDiff.tsx`, `lib/exercises/plugins/shadowing/Renderer.tsx` (polish) | M | FR-SPEAK-02,05 | Slice 1 |
| T-3-SPEAK-02 | Pronunciation scoring polish + tutor textual feedback | Heuristic + optional LLM textual feedback (“Try rounding your ‘r’...”) via tutor | C-level gets textual hint; score still heuristic (no cloud ASR) | `lib/speech/scoring.ts` (tune), `lib/ai/provider.ts` (pronunciation feedback prompt) | M | FR-SPEAK-05 | T-3-SPEAK-01 |
| T-3-SPEAK-03 | WASM whisper spike (optional, not blocking) | Spike `WasmWhisperAdapter` behind feature flag; document decision in `docs/adr/speaking-wasm.md` | Spike runs locally; decision log records keep/drop | `lib/speech/wasm-adapter.ts` (spike), `docs/adr/speaking-wasm.md` | S (spike) | FR-SPEAK-01 | T-3-SPEAK-02 |
| T-3-ADMIN-01 | Admin guard + layout | `(admin)/admin/layout.tsx` with role guard (403 for students, S-AUTH-04) + nav | Student → 403; admin → panel | `app/(admin)/admin/layout.tsx`, `lib/auth/requireAdmin.ts`, `middleware.ts` (admin branch) | M | FR-ADMIN-01,02 | Slice 1 |
| T-3-ADMIN-02 | Admin CRUD: Levels/Units/Lessons | CRUD routes + UI (list, create, edit, delete) for `levels`, `units`, `lessons` with Zod validation + RLS | Admin creates unit → student sees it (S-spec edge E10 idempotent) | `app/(admin)/admin/levels/*`, `app/(admin)/admin/units/*`, `app/api/admin/lessons/route.ts`, `lib/validation/admin.ts` | L (split into 2 PRs if >100) | FR-ADMIN-01 | T-3-ADMIN-01 |
| T-3-ADMIN-03 | Admin CRUD: Exercises (13 types) | Exercise editor with type switcher, JSONB prompt/solution editors per Zod schema, `ai_generated` flag | Admin edits `fill_blanks` prompt → student sees updated exercise | `app/(admin)/admin/exercises/*`, `app/api/admin/exercises/route.ts`, `components/admin/ExerciseEditor.tsx` | L (split) | FR-ADMIN-01 | T-3-ADMIN-02 |
| T-3-ADMIN-04 | Admin CRUD: Challenges/Badges/Shop | CRUD for `challenges`, `badges`, `shop_items` | Admin creates challenge → students can enroll | `app/(admin)/admin/challenges/*`, `app/(admin)/admin/badges/*`, `app/(admin)/admin/shop/*` | M | FR-ADMIN-01 | T-3-ADMIN-02 |
| T-3-ADMIN-05 | Admin users (read-only PII) + moderation | `/admin/users` list (paginated, RLS), user detail (attempts, progress), moderation actions (disable) | Admin views users; no bulk PII export (minimal) | `app/(admin)/admin/users/page.tsx`, `lib/dal/admin-users.ts` | M | FR-ADMIN-03 | T-3-ADMIN-01 |
| T-3-ADMIN-06 | Admin seed re-run (idempotent) | Button + API `POST /api/admin/seed` that runs `prisma/seed.ts` idempotently; log output | Re-run doesn't duplicate (E10); shows count | `app/api/admin/seed/route.ts`, `app/(admin)/admin/seed/page.tsx` | S | FR-ADMIN-04 | T-3-ADMIN-02 |
| T-3-PWA-02 | PWA offline polish + background sync | Full offline: visited lessons + SRS + flashcards; Workbox background sync; install prompt; offline indicator polish | Lighthouse PWA ≥90; offline review E2E passes | `app/sw.ts` (polish), `components/pwa/InstallPrompt.tsx`, `tests/pwa-offline.spec.ts` (Playwright) | M | FR-PWA-01,02,03 | T-2-PWA-01 |
| T-3-MONET-01 | Paywall placeholders | Route guards + UI stubs “Upgrade to unlock” for future premium; `user.subscription` stub in `User` | Premium routes show placeholder; free routes unaffected | `lib/monetization/guard.ts`, `components/monetization/PaywallPlaceholder.tsx`, `prisma/schema.prisma` (subscription stub) | S | — | T-3-ADMIN-01 |
| T-3-POLISH-01 | Shareable badge page + informal certificate | `/badges/[code]` public badge page (informal, no PDF), share button | Pass level → badge page shareable; no official cert (FR-EVAL-02) | `app/(app)/badges/[code]/page.tsx`, `components/gamification/BadgeShare.tsx` | S | FR-EVAL-02 | T-3-CONTENT-03 |
| T-3-POLISH-02 | Accessibility + performance audit | Axe + Lighthouse (PWA, perf, a11y); fix critical; Tailwind mobile-first audit | Lighthouse perf ≥85, PWA ≥90, a11y no critical | `docs/audits/lighthouse.md`, `components/*` (fixes) | S | NFR-02,03 | All prior |
| T-3-DEPLOY-01 | Vercel deploy Slice 3 (production) | Final PR, production deploy, `prisma migrate deploy`, full seed A1-C2, domain setup | Production URL live with full CEFR, admin, PWA, paywall placeholders | `vercel.json`, `prisma/migrations/*` | S | — | All T-3 |

---

## 4. Review Workload Forecast & Chained PR Recommendation

### 4.1 Task Size Distribution

| Slice | Tasks | Est. Total Lines | Avg per Task | Largest Task |
|-------|-------|------------------|--------------|--------------|
| Slice 0 (Setup) | 7 | ~250 | 35 | M (60) |
| Slice 1 (A1-A2) | ~27 | ~1,200 | 44 | L (90, split) |
| Slice 2 (B1-B2) | 14 | ~650 | 46 | L (90) |
| Slice 3 (C1-C2) | 15 | ~700 | 46 | L (90, split) |
| **Total** | **63** | **~2,800** | **44** | — |

All tasks target **<100 lines**; L tasks are scripts/seeds that touch generated data — they are low-risk for review (Zod-validated JSON).

### 4.2 Chained PR Map (Recommended)

PRs are stacked; each PR is reviewable in <30 min. Use `gh` CLI; Vercel preview per PR.

```
main
 │
 ├─ PR#1  slice0/bootstrap                (T-0-SETUP-01..07)                         ~250 lines
 │   └─ PR#2  slice1/auth-cefr            (T-1-AUTH-01..04, T-1-CEFR-01..06)          ~350 lines — SPLIT if needed: 2a auth, 2b cefr
 │       └─ PR#3  slice1/exercise-engine   (T-1-EX-01..11)                            ~400 lines — SPLIT: 3a registry+4 types, 3b 7 types+seed
 │           └─ PR#4  slice1/speaking-tutor (T-1-SPEAK-01..05, T-1-TUTOR-01..04)       ~350 lines
 │               └─ PR#5  slice1/eval-game  (T-1-EVAL-01..03, T-1-GAME-01..04)         ~300 lines
 │                   └─ PR#6  slice1/polish-deploy (T-1-SEED-01..02, T-1-POLISH-01..02, T-1-DEPLOY-01) ~300 lines
 │                       └─ PR#7  slice2/content     (T-2-CONTENT-01..03)             ~250 lines
 │                           └─ PR#8  slice2/challenges (T-2-CHAL-01..03)            ~180 lines
 │                               └─ PR#9  slice2/srs       (T-2-SRS-01..03)           ~180 lines
 │                                   └─ PR#10 slice2/game-pwa (T-2-GAME-01..02, T-2-NOTIF-01, T-2-PWA-01, T-2-I18N-01) ~300 lines
 │                                       └─ PR#11 slice2/deploy    (T-2-DEPLOY-01)    ~30 lines
 │                                           └─ PR#12 slice3/c-content (T-3-CONTENT-01..03) ~250 lines
 │                                               └─ PR#13 slice3/speaking  (T-3-SPEAK-01..03) ~150 lines
 │                                                   └─ PR#14 slice3/admin-crud (T-3-ADMIN-01..04) ~400 lines — SPLIT: 14a guard+levels, 14b exercises, 14c challenges/badges/shop
 │                                                       └─ PR#15 slice3/admin-users-pwa (T-3-ADMIN-05..06, T-3-PWA-02) ~150 lines
 │                                                           └─ PR#16 slice3/polish-deploy (T-3-MONET-01, T-3-POLISH-01..02, T-3-DEPLOY-01) ~150 lines
```

**Total: 16 PRs**, each <400 lines (many <300). Largest PRs (PR#3, PR#14) are explicitly marked SPLIT.

### 4.3 Review Guidance

- **Review order:** Strictly sequential (each PR builds on the prior branch). Use `gh pr create --base slice1/auth-cefr` etc. for stacking.
- **Vercel:** Preview per PR — reviewer checks feature in preview, not just code.
- **Granular sub-slices:** Every exercise plugin is one file set; reviewer can approve plugins independently.
- **Risk hotspots:** `T-1-SPEAK-02` (Web Speech browser matrix), `T-1-TUTOR-02` (rate limits), `T-2-SRS-01` (SM-2 correctness), `T-3-ADMIN-02/03` (RLS admin guard) — these need focused review.
- **Automated checks per PR:** `npm run lint && npm run typecheck && npm run build && npm test` (Vitest) + `scripts/check-i18n.ts`.

### 4.4 Dependencies Summary

```
Slice 0 ──> Slice 1 (auth, CEFR, exercise engine must land in order; speaking/tutor parallel after registry)
Slice 1 ──> Slice 2 (B content needs A catalog; SRS needs attempts; challenges needs levels)
Slice 2 ──> Slice 3 (C content needs B; admin needs full schema; polish needs all)
```

No circular dependencies. Slice 2 and 3 tasks within a slice can be parallelized where noted, but PR chain enforces linear merge order for safety.

---

## 5. Coverage Checklist (Spec + Design → Tasks)

| Spec FR | Tasks |
|---------|-------|
| FR-AUTH-* | T-1-AUTH-01..04, T-3-ADMIN-01 |
| FR-CEFR-* | T-1-CEFR-01..06, T-1-AUTH-03, T-1-EVAL-01..02 |
| FR-EX-* | T-1-EX-01..11, T-1-SEED-01..02, T-1-TUTOR-04 |
| FR-LST-* | T-1-EX-08..09 |
| FR-READ-* | T-1-EX-10 |
| FR-WRITE-* | T-1-EX-11, T-1-TUTOR-01..02 |
| FR-SPEAK-* | T-1-SPEAK-01..05, T-3-SPEAK-01..03 |
| FR-TUTOR-* | T-1-TUTOR-01..04 |
| FR-SRS-* | T-2-SRS-01..03 |
| FR-CHAL-* | T-2-CHAL-01..03 |
| FR-EVAL-* | T-1-EVAL-01..03, T-3-CONTENT-03, T-3-POLISH-01 |
| FR-GAME-* | T-1-GAME-01..04, T-2-GAME-01..02 |
| FR-NOTIF-* | T-2-NOTIF-01, T-2-GAME-01 |
| FR-I18N-* | T-0-SETUP-03, T-2-I18N-01 |
| FR-PWA-* | T-0-SETUP-05, T-2-PWA-01, T-3-PWA-02, T-1-CEFR-06 |
| FR-ADMIN-* | T-3-ADMIN-01..06 |
| Design §2 (Schema/RLS) | T-1-CEFR-01, T-1-EX-02, T-1-GAME-01..02, T-2-SRS-01, T-2-CHAL-01, etc. |
| Design §4 (Exercise engine) | T-1-EX-01..11 |
| Design §5 (Speaking) | T-1-SPEAK-* |
| Design §6 (Tutor) | T-1-TUTOR-* |
| Design §7 (SRS) | T-2-SRS-* |
| Design §8 (Gamification) | T-1-GAME-*, T-2-GAME-* |
| Design §9 (PWA) | T-2-PWA-01, T-3-PWA-02 |
| Design §10 (i18n) | T-0-SETUP-03, T-2-I18N-01 |
| Design §11 (Auth) | T-1-AUTH-* |
| Design §12 (Deploy) | T-1-DEPLOY-01, T-2-DEPLOY-01, T-3-DEPLOY-01 |

All FRs and design sections are covered. No orphan requirements.
