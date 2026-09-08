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

## Deferred to Slice 3 (not in this commit)
- Slice 3: C1-C2, speaking advanced, admin CRUD, PWA offline full, paywall placeholders

## Next Steps
- Provision Supabase project, set DATABASE_URL + anon keys, run `prisma migrate dev` then `npm run seed` to materialize catalog
- Optional: set OPENROUTER_API_KEY to enable real tutor (mock works without)
- Create chained PRs via `gh` (<400 lines each) after review

---

# Apply Progress — Slice 2 (B1-B2 + Challenges + SRS + Leaderboard)

**Date:** 2026-09-08
**Branch:** main (stacked on 8 Slice-1 commits)
**Commits:** 7 work-unit commits for Slice 2 (each <400 lines, conventional):
  1. `feat(db): add Slice 2 models Challenge, SrsCard, SrsReview, Notification and Leaderboard` (schema + migration)
  2. `feat(srs): add SM-2 engine, IndexedDB mirror and DAL` (lib/srs/sm2.ts, indexed-db.ts, tests 9 cases)
  3. `feat(challenges): add challenge rules, enrollment and completion service with scheduler stub` (rules+service, 5 types, 5 tests)
  4. `feat(content): expand seed to B1-B2 with graded readings and all 13 types` (B_TEMPLATES, 58 B-exercises, 5 challenge seeds, b1/b2 badges)
  5. `feat(api): add challenges join, SRS review, leaderboard and shop APIs with gamification hooks` (leaderboard 5-min TTL, shop purchase XP, email stub, /api/challenges/[id]/join + /api/srs/review + /api/leaderboard + /api/challenges/cron + /api/shop/purchase, attempt wired to SRS+challenges)
  6. `feat(ui): add Challenges, Reviews and Leaderboard pages with shop purchases` (/challenges, /reviews daily+manual filter, /leaderboard weekly/all-time, nav, shop buy)
  7. `feat(pwa+i18n): polish offline, preferences toggles and cron for Slice 2` (useOnlineStatus, SW SRS offline-first, cron vercel.json, Zustand srs/challenges/email toggles, middleware, i18n EN/ES)
  8. `feat(api): add enroll alias for challenges join endpoint` (/api/challenges/[id]/enroll mirror)
**Build:** ✓ `npm run build` 25 routes (was 13), First Load 101kB, Middleware 104kB — DB auth warnings expected (no provisioned DB, graceful fallbacks)
**Tests:** ✓ `npm test` 31/31 passed (6 files: exercises-registry 2, exercise-evaluators 7, speech-scoring 3, gamification 5, srs-sm2 9, challenges 5) — was 17/17
**Routes added:** `/challenges`, `/reviews`, `/leaderboard`, `/api/challenges/[id]/join`, `/api/challenges/[id]/enroll`, `/api/challenges/cron`, `/api/srs/review`, `/api/leaderboard`, `/api/shop/purchase`
**Seed:** Idempotent upsert now covers A1..B2 (4 levels ×2 units ×3 lessons + 4 exams = 28 lessons, ~90+ exercises spanning all 13 types, graded readings expanded for B1/B2 Remote Work passage, Zod-compatible registry, challenges 5 types daily/weekly/timed/streak/competitive, 12 badges including b1_complete/b2_complete)
**Key libs:** `lib/srs/sm2.ts` (SM-2 interval/ease/lapses/dueDate, quality 0-5, tests for SM-2), `lib/srs/indexed-db.ts` (IndexedDB mirror with localStorage fallback), `lib/challenges/rules.ts+service.ts` (enroll/progress/complete + XP rewards + schedulerTick), `lib/gamification/leaderboard.ts` (weekly+all-time, 5-min cache, DB persistence), `lib/gamification/shop.ts` (XP currency, insufficient/duplicate guards), `lib/notifications/email.ts` (Resend/Supabase email stub, ENABLE_EMAIL flag), `lib/hooks/useOnlineStatus.ts` + `app/sw.ts` offline-first for SRS queue

## Tasks Completed (Slice 2)
- [x] T-2-CONTENT-01 Seed B1 content (~30 exercises, 2 units ×3 lessons + exam, professional contexts)
- [x] T-2-CONTENT-02 Seed B2 content (~30 exercises, 2 units ×3 lessons + exam, academic/business flavor)
- [x] T-2-CONTENT-03 Seed B1-B2 quizzes/exams (lesson quizzes + B1/B2 level exams threshold 70)
- [x] T-2-CHAL-01 Challenge models + enroll/complete flow (Challenge, ChallengeParticipant, XP reward, notifications)
- [x] T-2-CHAL-02 Challenge types daily/weekly/timed/streak/competitive + scheduler helper + cron placeholder
- [x] T-2-CHAL-03 Challenges UI (dashboard + list, ChallengeCard pattern)
- [x] T-2-SRS-01 SRS models (SM-2) + review algorithm (srs_cards/srs_reviews, interval/ease, tests)
- [x] T-2-SRS-02 SRS daily queue + manual topic review UI (/reviews, srs_enabled gate, ?unitId filter)
- [x] T-2-SRS-03 SRS card creation hook + IndexedDB mirror (attempt → srs_cards auto, IndexedDB offline, /api/srs/review)
- [x] T-2-GAME-01 Leaderboard (weekly/all-time, cached 5min, /leaderboard page + /api/leaderboard)
- [x] T-2-GAME-02 Shop purchases (XP currency, UserInventory, /api/shop/purchase)
- [x] T-2-NOTIF-01 Email notifications (Resend/Supabase stub, Notification model, email_notifications opt-in)
- [x] T-2-PWA-01 PWA offline for reviews (IndexedDB for SRS, offline indicator, SW fetch handler, background sync ready)
- [x] T-2-I18N-01 i18n content polish (messages/en,es challenges/srs/gamification namespaces, check-i18n compatible)
- [x] T-2-DEPLOY-01 Vercel deploy Slice 2 ready (prisma migrate + seed B1-B2, preview routes, vercel.json crons)

## Zero-Paid / Constraints Kept
- No paid services: Resend free 3k/mo feature-flagged, Groq/OpenRouter free tiers, Web Speech primary, Supabase free, Vercel Cron free
- Mobile-first responsive, dark mode extended, RLS via DAL ownership checks, optional per user_preferences (srsEnabled, challengesEnabled flags)
- PWA installable, offline reviews via IndexedDB mirror, leaderboard cached (no paid Redis)

## Verification
- `npm run build` tail: 25 routes, ✓ compiled successfully, DB auth errors are graceful fallbacks (no DATABASE_URL provisioned)
- `npm test`: 31 passed, 6 files
- `git log --oneline`: 16 commits total (8 Slice-1 + 8 Slice-2), each <400 lines
