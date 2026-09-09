# Technical & Design Audit — English Learning Platform

**Date:** 2026-09-08  
**Project:** English Learning Platform (A1 → C2)  
**Stack:** Next.js 15 App Router / TypeScript 5.7 / Tailwind 4 / Prisma 6 / Supabase Postgres / AI SDK 4 / Serwist PWA / Zustand 5 / Zod 4

---

## ✅ Currently Shipped (Snapshot)

| Area                                                               | Status                                         |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| 13/13 exercise types                                               | ✅ full plugin (schema + evaluator + Renderer) |
| Gamification (XP, streaks, badges, shop, leaderboard, challenges)  | ✅ implemented                                 |
| SRS engine (SM-2) + offline IndexedDB queue                        | ✅ implemented                                 |
| AI Tutor (mock / openrouter / groq) + BYOK encryption              | ✅ implemented                                 |
| Speaking (WebSpeech + WASM + mock + scoring)                       | ✅ implemented                                 |
| i18n (next-intl en/es, as-needed prefix, check-i18n script)        | ✅ implemented                                 |
| Admin CRUD (levels/units/lessons/exercises/badges/shop/users/seed) | ✅ implemented                                 |
| PWA (Serwist sw.ts + sync-queue)                                   | ✅ implemented                                 |
| Unit tests (Vitest — 8 files)                                      | ✅ present (minimal coverage)                  |
| CI (lint, typecheck, build, test)                                  | ✅ GitHub Actions                              |
| Vercel deploy config + daily cron                                  | ✅ configured                                  |

---

## 🔍 Technical Gaps

### 1. Test Coverage & E2E Testing

- **Unit tests are minimal** — 8 test files, mostly pure-logic (evaluators, SM-2, gamification), no UI or integration tests.
- **No E2E testing** — no Playwright/Cypress setup. Critical user flows (auth → onboarding → lesson completion → streak persistence → SRS queue) are untested end-to-end.
- **No coverage threshold** in CI config — `npm test` runs but doesn't enforce a minimum.
- **Heavy mock usage** suggests many tests pass without validating real Supabase/Prisma behavior.

### 2. Performance & Observability

- **No error tracking** — no Sentry, LogRocket, or any production error monitoring.
- **No analytics** — no way to know which exercises fail most, which levels have highest drop-off, or where users get stuck.
- **No bundle analyzer** hook in CI (Next.js 15 includes it but it's not configured).
- **Audio/TTS performance** — Web Speech API usage on mobile is untested for performance budgets.

### 3. Security & Hardening

- **RLS NOT applied** — the README marks it "optional" but user data (attempts, progress, SRS cards) is exposed without row-level security in Supabase. This is the single largest security risk.
- **No rate limiting** on sensitive APIs (`exercise/attempt`, `srs/review`, `shop/purchase`).
- **No explicit CSRF protection** documentation (Next.js handles SameSite cookies, but it’s undocumented).
- **No audit logging** — admin actions aren’t recorded. No trail of who created/edited exercises or changed settings.

### 4. Infrastructure Completeness

- **Cron is daily-only (`0 0 * * *`)** — but the ChallengeType enum includes `weekly`, `timed`, `streak`, and `competitive`, which need different cron schedules or dynamic scheduling logic. The current cron only handles daily challenge rotation.
- **No background job queue** — email notifications, AI generation, and other async tasks have no worker infrastructure. The email system is feature-flagged and disabled by default (`ENABLE_EMAIL = "true"` required).
- **No retry/backoff** logic for failed API calls (the sync-queue flushes but with no backoff).

### 5. Accessibility (a11y)

- **No accessibility auditing** — no axe-core, pa11y, or Lighthouse CI in the pipeline.
- **Speaking exercises** depend entirely on Web Speech API. No fallback for users with hearing impairments or speech disabilities.
- **No color-contrast verification** documented for the dark/light theme tokens.

---

## 🎨 Design Gaps

### 1. Interface Design

- **Placeholder screenshots** — README says "Replace placeholders with real captures" but has not been done.
- **No documented design system** — color tokens, spacing scale, and typography are implemented in code but not formally specified (no Figma file, no `.tokens.json`).
- **UI component organization is inconsistent** — some shared UI is in `components/ui/` (Skeleton, ThemeToggle) while domain components are scattered in feature folders (gamification, speech, pwa).

### 2. User Experience Gaps

- **No onboarding/tutorial flow** — the app has a complex system (13 exercise types, SRS, challenges, shop, BYOK AI) but zero first-run walkthrough or contextual help.
- **No user feedback loop** — users can’t report a confusing exercise, a bug, or request a feature from within the UI.
- **Mobile UX not validated for audio** — dictation, shadowing, and pronunciation exercises are critical on mobile but there’s no mobile-audio testing mentioned.
- **Progress visualization is shallow** — the dashboard shows a "continue" hint but there’s no detailed progress dashboard (weak areas per skill, time-spent heatmaps, streak history timeline).

### 3. Premium/Payment Flow

- **Stripe is "coming soon"** — mentioned as a placeholder in multiple places (`ENABLE_EMAIL`, paywall text) but no integration exists, no webhooks, no real checkout flow.
- **No pricing page** or documented subscription model.

### 4. Content & Localization

- **i18n key count mismatch** — README claims "122 keys each" but inspection shows 28 top-level keys. The actual messages files are more complete, so this is a README drift, but indicates docs need tightening.
- **No content management** beyond the admin CRUD — teachers can’t collaboratively create lessons without sharing admin credentials. No draft/publish workflow.
- **No content validation** on the admin side — an exercise with a malformed prompt/solution JSON could crash the Renderer in production.

---

## ⚠️ Priority Matrix

| Priority        | Area                                  | Impact                                                                           |
| --------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| 🔴 **Critical** | **Supabase Row-Level Security (RLS)** | User data (attempts, progress, SRS) is fully exposed without policy enforcement. |
| 🔴 **Critical** | **Error Tracking (Sentry / similar)** | Bugs in production are completely invisible. High user-experience risk.          |
| 🟠 **High**     | **E2E Tests (Playwright)**            | Unit tests don't guarantee the full user flow works end-to-end.                  |
| 🟠 **High**     | **Onboarding / UX Tutorial**          | The system is complex enough that new users likely get lost without guidance.    |
| 🟡 **Medium**   | **Rate Limiting on Sensitive APIs**   | Prevents spam/abuse of exercise attempts and SRS submissions.                    |
| 🟡 **Medium**   | **Background Jobs / Extended Cron**   | Needed to properly support weekly/timed/competitive challenge rotation.          |
| 🟢 **Low**      | **Design System Documentation**       | Improves consistency and onboarding for future designers/developers.             |

---

## 💡 Recommendation

This project has moved well beyond "portfolio demo" — it's a production-grade application with real complexity. The gaps are not in features, but in **production robustness and observability**:

1. **Implement Supabase RLS policies** first — it’s the single biggest security gap and straightforward to add given the existing schema has clear ownership relationships.
2. **Add Sentry (or equivalent) error tracking** + a lightweight analytics event (e.g., exercise completed, challenge joined) to understand user behavior.
3. **Write Playwright E2E tests** for the 3–4 most critical flows: authentication, lesson completion, streak tracking, and the SRS review cycle.

Want to dive into any of these three priorities next? I can help you design the RLS policy rollout, scaffold the Playwright test suite, or set up Sentry integration — just point me at one.
