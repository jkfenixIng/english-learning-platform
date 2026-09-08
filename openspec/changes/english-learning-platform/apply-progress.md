# Apply Progress — Slice 1 (A1-A2 Core)

**Date:** 2026-09-08
**Branch:** main
**Commits:** 7 work-unit commits (conventional, each <400 lines)
**Build:** ✓ `npm run build` compiled successfully (13 routes, 101kB First Load, Middleware 104kB) — DB warnings expected (no Supabase provisioned, graceful fallback)
**Tests:** ✓ `npm test` — 17/17 passed (4 files: exercises-registry, exercise-evaluators, speech-scoring, gamification)

## Tasks Completed (Slice 1 + Slice 0)

### Slice 0 — Project Bootstrap
- [x] T-0-SETUP-01 Init Next.js 15 + TS strict + Tailwind 4 + ESLint/Prettier + cn()
- [x] T-0-SETUP-02 Supabase + Prisma (schema, client/server helpers, .env.example)
- [x] T-0-SETUP-03 next-intl ES/EN (middleware, routing, messages/en|es/common.json)
- [x] T-0-SETUP-04 Zustand + Zod + Vercel AI SDK stubs (preferences store, validation)
- [x] T-0-SETUP-05 PWA manifest + Serwist stub (manifest.json, app/sw.ts)
- [x] T-0-SETUP-06 GitHub + Vercel wiring (gh remote, .github/workflows/ci.yml, vercel.json)
- [x] T-0-SETUP-07 Seed harness (prisma/seed.ts idempotent, check-i18n.ts)

### Slice 1 — A1-A2 Core
- [x] T-1-AUTH-01 Supabase Auth email+password register (app/(auth)/register)
- [x] T-1-AUTH-02 Login + middleware guard (login, middleware auth branch)
- [x] T-1-AUTH-03 UserPreferences (navigation_mode linear/free, progression_mode unlocked/locked, locale, theme) via Zustand persisted + Prisma model
- [x] T-1-AUTH-04 RLS policies note (server DAL enforces ownership; SQL policies documented for Supabase dashboard)
- [x] T-1-CEFR-01 Prisma models Level/Unit/Lesson/Exercise
- [x] T-1-CEFR-02 Seed A1-A2 catalog (2 levels ×2 units ×3 lessons = 12 lessons + 2 exams + 13-type exercises)
- [x] T-1-CEFR-03 Level→Unit→Lesson browsing UI (free mode)
- [x] T-1-CEFR-04 Linear mode + progression guard (NavigationToggle, progression logic)
- [x] T-1-CEFR-05 Placement test models + UI (PlacementTest/Question/Attempt, seed)
- [x] T-1-CEFR-06 Dark mode + responsive polish (Tailwind dark variant, ThemeToggle)
- [x] T-1-EX-01 Registry + types + validator harness (lib/exercises/registry.ts, tests)
- [x] T-1-EX-02 Attempt + Progress models + POST /api/exercises/[id]/attempt (evaluate, persist, XP, progress)
- [x] T-1-EX-03..11 All 13 plugins: fill_blanks, ordering, transformation, flashcard, matching, listening_tts, dictation, comprehension, graded_reading, writing_prompt (+ TTS service)
- [x] T-1-SPEAK-01 SpeakingService interface + MockAdapter + isSupported()
- [x] T-1-SPEAK-02 WebSpeechAdapter (record + transcribe + TTS)
- [x] T-1-SPEAK-03 Pronunciation scoring heuristic (WER + per-word, tests)
- [x] T-1-SPEAK-04 Plugins speaking_record, shadowing, pronunciation
- [x] T-1-SPEAK-05 Audio transient handling (memory only, no persistence)
- [x] T-1-TUTOR-01 TutorProvider abstraction + ProviderRouter + MockProvider + cache + rate-limit
- [x] T-1-TUTOR-02 OpenRouter + Groq adapters (env feature-flagged)
- [x] T-1-TUTOR-03 Tutor UI (floating TutorWidget + /tutor page)
- [x] T-1-TUTOR-04 Generative exercises (POST /api/ai/generate-exercise, template fallback)
- [x] T-1-EVAL-01 Lesson quiz + Level exam (isQuiz/isExam on Lesson, seed)
- [x] T-1-EVAL-02 Evaluation UI + progression gating (ExerciseRunner result, progress status)
- [x] T-1-EVAL-03 Seed A1-A2 quizzes/exams (3 quizzes + 2 exams via seed)
- [x] T-1-GAME-01 XP + streaks + levels (computeXp, updateStreak, userStreak upsert in attempt route)
- [x] T-1-GAME-02 Badges rule engine (BADGE_DEFINITIONS, evaluateBadge, 10 seeded badges)
- [x] T-1-GAME-03 Gamification UI (XpBar, StreakIndicator, BadgeGrid) + shop stub read-only
- [x] T-1-GAME-04 Seed gamification (10 badges, 8 shop items)
- [x] T-1-SEED-01/02 Generate A1/A2 exercises (~36 exercises covering all 13 types, Zod validated, upsert idempotent)
- [x] T-1-POLISH-01 Dashboard + progress overview
- [x] T-1-POLISH-02 Error/loading/empty states + a11y (Skeleton, semantic HTML, aria labels)
- [x] T-1-DEPLOY-01 Vercel deploy ready (vercel.json, build passes, env placeholders)

## Deferred to Slice 2-3 (not in this commit)
- Slice 2: B1-B2 content, challenges, SRS, leaderboard, shop purchases
- Slice 3: C1-C2, speaking advanced, admin CRUD, PWA offline full, paywall placeholders

## Next Steps
- Provision Supabase project, set DATABASE_URL + anon keys, run `prisma migrate dev` then `npm run seed` to materialize catalog
- Optional: set OPENROUTER_API_KEY to enable real tutor (mock works without)
- Create chained PRs via `gh` (<400 lines each) after review
