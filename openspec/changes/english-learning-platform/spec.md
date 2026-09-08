# Specification: English Learning Platform (Delta Specs)

> **Change ID:** `english-learning-platform` · **Phase:** spec · **Date:** 2026-09-08 · **Store:** hybrid (file + engram `sdd/english-learning-platform/spec`) · **Depends on:** `proposal.md` · **Convention:** RFC 2119 (MUST/SHALL/SHOULD/MAY), Given/When/Then scenarios, traceable FR-xxx

## 1. Overview

Delta specs for a universal, self-study, CEFR A1-C2 English platform with AI tutor, 13 exercise types, SRS, challenges, evaluations, gamification, PWA, and admin. All requirements are **delta** against greenfield — no prior spec to amend.

---

## 2. Data Model Overview

### 2.1 Entity-Relationship (Summary)

```
User ──< UserPreferences (1:1)
User ──< Attempt ──> Exercise ──> Lesson ──> Unit ──> Level (CEFR A1-C2)
User ──< Progress (per lesson/level)
User ──< SrsCard ──> Exercise/Vocab
SrsCard ──< SrsReview
User ──< UserStreak / UserBadge / UserInventory
Challenge ──< ChallengeParticipant ──> User
ShopItem ──< UserInventory
Badge ──< UserBadge
PlacementAttempt ──> User, Level (recommended)
Notification ──> User
```

### 2.2 Tables (Prisma/Supabase)

| Table | Key Fields | Notes |
|-------|------------|-------|
| `users` | `id uuid PK (auth.uid)`, `email`, `name`, `dob date?`, `gender?`, `role: student|admin`, `locale: en|es`, `created_at` | Minimal PII; `dob`/`gender` optional |
| `user_preferences` | `user_id PK FK`, `navigation_mode: linear|free`, `progression_mode: unlocked|locked`, `locale`, `theme: light|dark`, `srs_enabled bool`, `email_notifications bool` | Persisted per user |
| `levels` | `id uuid PK`, `code: A1|A2|B1|B2|C1|C2 UNIQUE`, `title`, `description`, `order_index` | 6 rows fixed |
| `units` | `id uuid PK`, `level_id FK`, `title`, `description`, `order_index`, `cover_image?` | |
| `lessons` | `id uuid PK`, `unit_id FK`, `title`, `objectives`, `order_index`, `estimated_minutes` | |
| `exercises` | `id uuid PK`, `lesson_id FK`, `type` (13 values), `difficulty 1-5`, `prompt jsonb`, `solution jsonb`, `assets jsonb`, `ai_generated bool`, `version`, `created_at` | JSONB + Zod per type |
| `attempts` | `id uuid PK`, `user_id FK`, `exercise_id FK`, `answer jsonb`, `score numeric 0-100`, `feedback jsonb`, `time_spent_ms`, `created_at` | Indexed `(user_id, exercise_id, created_at)` |
| `progress` | `id uuid PK`, `user_id FK`, `lesson_id FK`, `status: not_started|in_progress|completed`, `best_score`, `completed_at?`, `updated_at` | One row per user×lesson |
| `srs_cards` | `id uuid PK`, `user_id FK`, `exercise_id FK`, `interval int`, `ease_factor float`, `repetitions int`, `due_date date`, `lapses int`, `created_at` | SM-2 fields; index `(user_id, due_date)` |
| `srs_reviews` | `id uuid PK`, `card_id FK`, `quality 0-5`, `reviewed_at` | History |
| `challenges` | `id uuid PK`, `type: daily|weekly|timed|streak|competitive`, `title`, `description`, `rule jsonb`, `start_at`, `end_at`, `reward_xp` | |
| `challenge_participants` | `id uuid PK`, `challenge_id FK`, `user_id FK`, `progress jsonb`, `completed bool`, `completed_at?` | |
| `badges` | `id uuid PK`, `code UNIQUE`, `title`, `description`, `icon`, `rule jsonb` | Informal achievements |
| `user_badges` | `user_id FK`, `badge_id FK`, `earned_at` | PK `(user_id, badge_id)` |
| `user_streaks` | `user_id PK FK`, `current_streak int`, `longest_streak int`, `last_activity_date date`, `freeze_count int` | |
| `shop_items` | `id uuid PK`, `title`, `price_xp int`, `cosmetic_type`, `asset_url`, `rarity` | XP currency only |
| `user_inventory` | `user_id FK`, `shop_item_id FK`, `purchased_at` | |
| `placement_tests` | `id uuid PK`, `title`, `is_active bool` | |
| `placement_questions` | `id uuid PK`, `test_id FK`, `level_hint`, `prompt jsonb`, `solution jsonb`, `weight` | |
| `placement_attempts` | `id uuid PK`, `user_id FK`, `test_id FK`, `score numeric`, `recommended_level FK`, `created_at` | |
| `notifications` | `id uuid PK`, `user_id FK`, `type`, `payload jsonb`, `read bool`, `created_at` | Email + in-app |
| `leaderboard_cache` | `window: weekly|all_time`, `user_id FK`, `xp int`, `rank int`, `computed_at` | Materialized, TTL 5m |

### 2.3 RLS (Supabase)

- **Public read**: `levels`, `units`, `lessons`, `exercises`, `challenges`, `badges`, `shop_items`.
- **Owner-only**: `attempts`, `progress`, `srs_cards`, `srs_reviews`, `user_badges`, `user_streaks`, `user_inventory`, `placement_attempts`, `notifications`, `user_preferences` — policy `auth.uid() = user_id`.
- **Admin-only**: write on content tables (`levels`...`exercises`, `challenges`, `badges`, `shop_items`) — policy `auth.jwt() ->> 'role' = 'admin'` (or `users.role` lookup via function).

---

## 3. Functional Requirements

### 3.1 Auth & User (FR-AUTH)

| ID | Requirement |
|----|-------------|
| FR-AUTH-01 | System MUST require `email + password` login via Supabase Auth for all access except public marketing/landing. |
| FR-AUTH-02 | System MUST support registration with minimal PII: `name` required, `email` required, `dob` optional, `gender` optional. No sensitive data collected. |
| FR-AUTH-03 | System SHALL assign roles `student` (default) and `admin` (manual via DB or admin panel). No `teacher` role SHALL exist. |
| FR-AUTH-04 | System MUST enforce RLS so users can only read/write their own rows (see §2.3). |
| FR-AUTH-05 | System MUST support password reset via Supabase Auth email flow. |
| FR-AUTH-06 | System SHOULD show auth errors in the user's locale (ES/EN). |

**Scenarios:**

- **S-AUTH-01 — Register student:**
  > **Given** an unauthenticated visitor on `/register`  
  > **When** they submit valid `name`, `email`, `password`, optional `dob`/`gender`  
  > **Then** Supabase Auth creates user, `users` row with `role=student` is inserted, session is established, and user is redirected to `/dashboard` with locale-appropriate welcome.
- **S-AUTH-02 — Login mandatory:**
  > **Given** unauthenticated user  
  > **When** they request `/app/*`  
  > **Then** they are redirected to `/login` (middleware guard).
- **S-AUTH-03 — RLS isolation:**
  > **Given** student A and student B  
  > **When** A queries `attempts` where `user_id = B.id`  
  > **Then** zero rows are returned (RLS).
- **S-AUTH-04 — Admin gate:**
  > **Given** a `student` attempts `POST /api/admin/exercises`  
  > **When** request is evaluated  
  > **Then** 403 Forbidden is returned.

### 3.2 CEFR Navigation & Preferences (FR-CEFR)

| ID | Requirement |
|----|-------------|
| FR-CEFR-01 | System MUST model exactly 6 CEFR levels `A1|A2|B1|B2|C1|C2` in strict order; no extra levels. |
| FR-CEFR-02 | System MUST provide navigation toggle `linear` (ordered, sequential) vs `free` (catalog/grid) — persisted in `user_preferences.navigation_mode`, applied per session. |
| FR-CEFR-03 | System MUST default `navigation_mode` to `free` and `progression_mode` to `unlocked`; user MAY toggle either in settings. |
| FR-CEFR-04 | System MUST provide optional diagnostic placement test, user-initiated, non-mandatory; result recommends a level but MUST NOT auto-enroll. |
| FR-CEFR-05 | System MUST render hierarchy Level → Unit → Lesson → Exercise with `order_index` ordering. |
| FR-CEFR-06 | When `progression_mode=locked`, system MUST block advance until prior evaluation passes threshold; when `unlocked` (default), all content is browsable. |

**Scenarios:**

- **S-CEFR-01 — Toggle navigation:**
  > **Given** student on `/settings` with `navigation_mode=free`  
  > **When** they switch to `linear` and reload `/app/levels/A1`  
  > **Then** lessons render sequentially with prev/next guards and `user_preferences` reflects `linear`.
- **S-CEFR-02 — Placement test optional:**
  > **Given** new student on dashboard  
  > **When** they click “Placement Test” and complete it with score mapping to B1  
  > **Then** result shows “Recommended: B1” with CTA “Start B1” and “Browse all levels”; no auto-enrollment occurs.
- **S-CEFR-03 — Unlocked default:**
  > **Given** new student  
  > **When** they visit `/app/levels/C1` without completing A1  
  > **Then** C1 content is accessible (unlocked default).
- **S-CEFR-04 — Locked mode gate:**
  > **Given** student sets `progression_mode=locked`  
  > **When** they try to open `B1/Unit2` without passing `B1/Unit1` exam (threshold 70)  
  > **Then** UI shows locked state with “Pass Unit 1 exam to unlock” and API returns 403 for lesson data if bypassed.

### 3.3 Exercise Engine — Core (FR-EX)

| ID | Requirement |
|----|-------------|
| FR-EX-01 | System MUST support all 13 exercise types: `fill_blanks`, `ordering`, `transformation`, `flashcard`, `matching`, `listening_tts`, `dictation`, `comprehension`, `graded_reading`, `writing_prompt`, `speaking_record`, `shadowing`, `pronunciation`. |
| FR-EX-02 | System MUST implement plugin architecture: each type registers a `Renderer`, `Evaluator`, and Zod schema; adding a type MUST NOT require modifying evaluators of other types. |
| FR-EX-03 | System MUST persist `attempts` with `answer`, `score 0-100`, `feedback`, `time_spent_ms`. |
| FR-EX-04 | System MUST support hybrid bank: curated (versioned, `ai_generated=false`) + generative AI (`ai_generated=true`, cached, rate-limited). |
| FR-EX-05 | System MUST validate `prompt`/`solution` JSONB per type via Zod on write (seed and admin CRUD). |
| FR-EX-06 | System SHOULD allow retry of any exercise without penalty; scoring uses best or latest per product rule (default: latest). |

**Scenarios:**

- **S-EX-01 — Fill blanks:**
  > **Given** lesson with `fill_blanks` exercise “She ___ (go) yesterday”  
  > **When** student submits “went”  
  > **Then** evaluator scores 100, feedback shows “Correct”, attempt is persisted, XP is awarded.
- **S-EX-02 — Ordering:**
  > **Given** ordering exercise with tokens `[yesterday, went, she, ...]`  
  > **When** student orders correctly  
  > **Then** score 100; if partially correct, partial score with diff highlighting.
- **S-EX-03 — Plugin isolation:**
  > **Given** new type `pronunciation` added  
  > **When** developer registers its module  
  > **Then** existing types' tests still pass without modification.
- **S-EX-04 — Generative AI (free tier):**
  > **Given** student requests “Generate more B1 vocabulary”  
  > **When** tutor provider is available  
  > **Then** system calls `TutorProvider.generateExercise`, caches by prompt hash, returns exercise with `ai_generated=true`; if provider unavailable or rate-limited, shows cached or template fallback with message.

### 3.4 Listening (FR-LST)

| ID | Requirement |
|----|-------------|
| FR-LST-01 | System MUST provide audio via native TTS (Web Speech `speechSynthesis`) for listening exercises; no paid TTS. |
| FR-LST-02 | System MUST support `listening_tts` and `dictation` types using TTS with voice/rate controls. |
| FR-LST-03 | System SHOULD offer replay and speed controls (0.75x, 1x, 1.25x). |

**Scenario S-LST-01:**
> **Given** `listening_tts` exercise  
> **When** student presses Play  
> **Then** `speechSynthesis` speaks the text with selected voice/rate; replay is available; if `speechSynthesis` unsupported, show transcript fallback with notice.

### 3.5 Reading (FR-READ)

| ID | Requirement |
|----|-------------|
| FR-READ-01 | System MUST support `graded_reading` (level-appropriate passages) + `comprehension` Q&A per reading. |
| FR-READ-02 | System SHOULD highlight target vocabulary in readings and link to flashcards. |

**Scenario S-READ-01:**
> **Given** B1 graded reading lesson  
> **When** student reads passage and answers 5 comprehension questions  
> **Then** each answer is scored, overall reading score computed, progress updated.

### 3.6 Writing (FR-WRITE)

| ID | Requirement |
|----|-------------|
| FR-WRITE-01 | System MUST support open `writing_prompt` exercises with AI correction via `TutorProvider.correctWriting`. |
| FR-WRITE-02 | System MUST show correction as inline annotations + overall score + suggestions; MUST queue offline attempts with notice. |
| FR-WRITE-03 | System MUST impose per-user rate limit for AI corrections on free tier (e.g., 20/day) with friendly message when exceeded. |

**Scenario S-WRITE-01:**
> **Given** writing prompt “Describe your weekend (80–100 words)”  
> **When** student submits 90-word text and AI is available  
> **Then** system returns annotated feedback (grammar, vocab, coherence) + score + rewrite suggestion; attempt is persisted.

### 3.7 Speaking — Solid (FR-SPEAK)

| ID | Requirement |
|----|-------------|
| FR-SPEAK-01 | System MUST implement speaking via provider-agnostic `SpeakingService` with `WebSpeechAdapter` primary (free, browser-local). |
| FR-SPEAK-02 | System MUST support `speaking_record`, `shadowing`, `pronunciation` types: record audio, transcribe, score against reference. |
| FR-SPEAK-03 | System MUST expose `isSupported()` and degrade gracefully on unsupported browsers (show typed transcript fallback with explanatory notice). |
| FR-SPEAK-04 | System MUST provide TTS playback for shadowing reference audio (native voices). |
| FR-SPEAK-05 | System SHOULD show word-level diff (WER-based) and heuristic pronunciation score (0–100). |
| FR-SPEAK-06 | System MUST NOT persist audio blobs by default (memory/IndexedDB transient); optional upload to Supabase Storage only if user opts in. |

**Scenarios:**

- **S-SPEAK-01 — Happy path (supported browser):**
  > **Given** Chrome with Web Speech available, `shadowing` exercise “Repeat: Could you elaborate?”  
  > **When** student plays reference, records, and stops  
  > **Then** transcript appears, heuristic score computed, word diff shown, attempt persisted (without audio blob unless opted in).
- **S-SPEAK-02 — Unsupported browser:**
  > **Given** Firefox without SpeechRecognition  
  > **When** student opens speaking exercise  
  > **Then** UI shows “Speaking not supported in this browser — type your response” fallback + hint to try Chrome/Edge; typed answer is still evaluated.
- **S-SPEAK-03 — No mic permission:**
  > **Given** user denies microphone  
  > **When** they attempt to record  
  > **Then** UI shows permission guidance and fallback input.

### 3.8 Virtual Tutor (FR-TUTOR)

| ID | Requirement |
|----|-------------|
| FR-TUTOR-01 | System MUST provide virtual AI tutor accessible from any lesson (floating tutor / chat). |
| FR-TUTOR-02 | System MUST abstract tutor behind `TutorProvider` interface with `ProviderRouter` (OpenRouter primary, Groq fallback, mock for tests/offline). |
| FR-TUTOR-03 | System MUST use Vercel AI SDK 5 for provider calls; swapping provider MUST be env-only (no code change). |
| FR-TUTOR-04 | System MUST cache tutor responses by prompt hash (TTL) and enforce per-user rate limits. |
| FR-TUTOR-05 | System SHOULD scope tutor system prompt to pedagogy (CEFR-aware, level-appropriate). |

**Scenario S-TUTOR-01:**
> **Given** student asks tutor “Explain past perfect vs past simple”  
> **When** provider is available  
> **Then** tutor replies level-appropriately, response is cached, and rate limit counter increments; when rate-limited, student sees “Daily AI limit reached — try template exercises”.

### 3.9 Review / SRS (FR-SRS)

| ID | Requirement |
|----|-------------|
| FR-SRS-01 | System MUST implement SRS via SM-2 (interval, ease_factor, repetitions, due_date, lapses) — all optional per user (`srs_enabled` toggle). |
| FR-SRS-02 | System MUST provide daily reviews queue (`due_date <= today` for user) and manual topic review (filter by unit/lesson). |
| FR-SRS-03 | System MUST create/update `srs_cards` from exercise attempts (configurable: vocab/flashcard types auto-enroll, others opt-in). |
| FR-SRS-04 | System MUST persist `srs_reviews` history with quality 0–5. |
| FR-SRS-05 | System SHOULD mirror SRS cards to IndexedDB for offline reviews and sync on reconnect. |

**Scenarios:**

- **S-SRS-01 — Daily queue:**
  > **Given** student with 5 cards due today and `srs_enabled=true`  
  > **When** they open `/app/reviews`  
  > **Then** 5 due cards appear in order; reviewing with quality 4 advances interval.
- **S-SRS-02 — Optional:**
  > **Given** student with `srs_enabled=false`  
  > **When** they complete exercises  
  > **Then** no SRS cards are created and reviews page shows “SRS disabled — enable in settings”.

### 3.10 Challenges (FR-CHAL)

| ID | Requirement |
|----|-------------|
| FR-CHAL-01 | System MUST support all challenge types: `daily`, `weekly`, `timed`, `streak`, `competitive` — each with rule, window, reward_xp. |
| FR-CHAL-02 | System MUST allow enrollment and track `challenge_participants` progress; completion awards XP/badges. |
| FR-CHAL-03 | System SHOULD show active/completed challenges on dashboard. |

**Scenario S-CHAL-01:**
> **Given** daily challenge “Complete 5 exercises today”  
> **When** student completes 5 exercises before midnight  
> **Then** challenge is marked completed, reward XP granted, badge checked.

### 3.11 Evaluations (FR-EVAL)

| ID | Requirement |
|----|-------------|
| FR-EVAL-01 | System MUST provide quiz per lesson and final exam per level (configurable threshold, default 70). |
| FR-EVAL-02 | System MUST NOT issue official certificates; instead award informal achievement badges on level exam pass. |
| FR-EVAL-03 | System MUST respect `progression_mode`: `unlocked` allows advance regardless of score; `locked` blocks until pass. |
| FR-EVAL-04 | System MUST persist evaluation attempts and best_score in `progress`. |

**Scenario S-EVAL-01:**
> **Given** student finishes A1 final exam with 82 (threshold 70)  
> **When** evaluated  
> **Then** badge `badge_a1_complete` is awarded, `progress` marked completed, and (if locked) next level unlocks.

### 3.12 Gamification (FR-GAME)

| ID | Requirement |
|----|-------------|
| FR-GAME-01 | System MUST award XP per exercise (base × difficulty × time bonus × streak multiplier), idempotently per attempt. |
| FR-GAME-02 | System MUST maintain `user_streaks` (current/longest/last_activity, freeze). |
| FR-GAME-03 | System MUST evaluate `BadgeRule` predicates on progress events and award `user_badges`. |
| FR-GAME-04 | System MUST provide leaderboard (weekly + all-time, top N, 5-min cache, display name). |
| FR-GAME-05 | System MUST provide shop/avatar store (cosmetic, XP currency, no real money); paywall placeholders for future monetization. |

**Scenario S-GAME-01:**
> **Given** student completes exercise with difficulty 3  
> **When** attempt is scored  
> **Then** XP is computed server-side, `user_streaks` updated if new day, badges evaluated, leaderboard cache invalidated.

### 3.13 Leaderboard & Notifications (FR-NOTIF)

| ID | Requirement |
|----|-------------|
| FR-NOTIF-01 | System MUST provide leaderboard endpoint (weekly/all-time) with pagination. |
| FR-NOTIF-02 | System MUST send email notifications via Resend or Supabase Auth free tier for opted-in users (streak reminders, challenge digests, SRS due). |
| FR-NOTIF-03 | System MUST store in-app `notifications` with `read` flag. |

### 3.14 i18n (FR-I18N)

| ID | Requirement |
|----|-------------|
| FR-I18N-01 | System MUST provide full UI i18n toggle `ES`/`EN`, user-switchable at any time, persisted in `user_preferences.locale` + cookie for SSR. |
| FR-I18N-02 | System MUST use next-intl with JSON namespaces (`common`, `exercises`, `gamification`, etc.) so content is easy to modify. |
| FR-I18N-03 | System MUST default locale to `en` or browser preference on first visit. |

### 3.15 PWA (FR-PWA)

| ID | Requirement |
|----|-------------|
| FR-PWA-01 | System MUST be a PWA (manifest, icons, install prompt) via Serwist. |
| FR-PWA-02 | System MUST support offline reviews (SRS cards + flashcards + visited lessons) via IndexedDB + Serwist caching; other features queue or warn when offline. |
| FR-PWA-03 | System MUST show offline indicator and background sync on reconnect. |
| FR-PWA-04 | System MUST be mobile-first responsive and support dark mode (persisted in preferences). |

### 3.16 Admin (FR-ADMIN)

| ID | Requirement |
|----|-------------|
| FR-ADMIN-01 | System MUST provide admin panel (`/admin`) restricted to `role=admin` with CRUD for `levels`, `units`, `lessons`, `exercises`, `challenges`, `badges`, `shop_items`. |
| FR-ADMIN-02 | System MUST enforce RLS + server guard for admin writes (403 for students). |
| FR-ADMIN-03 | System MUST allow admin to view users (read-only PII) and moderate content. |
| FR-ADMIN-04 | System SHOULD allow admin to re-run seed (idempotent upsert) from the panel or CLI. |

---

## 4. Edge Cases

| # | Case | Handling |
|---|------|----------|
| E1 | Browser without Web Speech (Safari/Firefox) | `SpeakingService.isSupported()` → fallback typed input + notice; no crash |
| E2 | Mic permission denied | Guidance UI + fallback input |
| E3 | Offline (no network) | PWA cache serves reviews; AI/writing queues with “offline” notice; sync on reconnect |
| E4 | Supabase RLS misconfig | Integration test asserts public catalog readable, user data isolated, admin write gated |
| E5 | AI provider rate-limited / down | Router falls back to next provider → cache → template; UI shows limit message, no data loss |
| E6 | Supabase free quota near limit | Monitoring note in dashboard; avoid audio persistence; image optimization; documented upgrade path |
| E7 | Double XP farming | Server-side scoring, idempotency key per attempt, time_spent sanity check |
| E8 | Placement test abandoned mid-way | Progress saved; user can resume or discard |
| E9 | Locale missing key | next-intl fallback to `en`; CI checks for missing keys |
| E10 | Seed re-run with existing data | Upsert by natural key (`levels.code`, `exercises.id`) — idempotent |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Free-tier only: MUST NOT require paid services to run (see proposal §1). |
| NFR-02 | Performance: LCP < 2.5s on 4G, Lighthouse PWA ≥ 90 after Slice 3. |
| NFR-03 | Accessibility: WCAG 2.1 AA for exercise renderers and navigation. |
| NFR-04 | Security: RLS on all tables, no PII beyond minimal, no secrets in client bundle. |
| NFR-05 | Scalability: Schema and indexes MUST support 50k MAU without redesign (free-tier scale). |
| NFR-06 | Maintainability: Exercise types are plugins; tutor/speaking are provider-abstracted. |

---

## 6. Traceability

Each FR maps to tasks in `tasks.md` via IDs (e.g., `FR-EX-01` → `T-EX-*`, `FR-SPEAK-*` → `T-SPEAK-*`). Spec is the contract for `design.md` and `tasks.md`.
