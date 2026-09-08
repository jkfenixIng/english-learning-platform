# Exploration: English Learning Platform

> **Change ID:** `english-learning-platform` · **Phase:** explore · **Date:** 2026-09-08 · **Store:** hybrid (file + engram `sdd/english-learning-platform/explore`)

## 1. Goal & Context

Build a **universal, 100% self-study English platform** (audience: kids, adults, seniors, conversational learners, certification Academy, school children) covering **general + professional + academic English** guided by a virtual AI tutor. Strict **CEFR A1-C2 (6 levels)**, 100% self-study. No owned content — generate initial bank from scratch. Zero paid services, generous free tiers, 5 initial users, easily scalable, future monetization ready (paywall placeholders). Stack target: Next.js 15 App Router + TypeScript strict + Tailwind 4 + Supabase Postgres free + Prisma or supabase-js + Supabase Auth + PWA (Serwist/next-pwa) + Vercel + GitHub.

This exploration investigates viable approaches for each major subsystem, compares alternatives, quantifies Supabase/free-tier limits, and recommends a stack with risks and mitigations.

---

## 2. CEFR Modeling Approaches

### 2.1 Domain Requirements

- 6 canonical levels: A1, A2, B1, B2, C1, C2 — no custom levels.
- Each level → N Units (thematic modules) → N Lessons → N Exercises.
- Progression: unlocked by default (user can jump), optional locked mode (must pass to advance) — persisted per-user preference.
- Navigation toggle: **linear ordered** vs **free browsing** (persisted preference, per session default).
- Optional diagnostic placement test (non-mandatory, user-initiated) that recommends a starting level.

### 2.2 Modeling Alternatives

| Approach | Schema | Pros | Cons | Verdict |
|----------|--------|------|------|---------|
| **A. Strict hierarchical FK** (`levels` → `units` → `lessons` → `exercises`, each with `level_id`/`unit_id`/`lesson_id` + `order_index`) | Normalized, simple queries | Simple RLS, easy ordering, Prisma-friendly | Slight join depth | **Recommended** |
| B. Materialized path / closure table | Extra tables for tree | Fast subtree queries | Over-engineered for fixed 3-depth hierarchy | Reject |
| C. Single `content_nodes` polymorphic table (type=level/unit/lesson/exercise) | One table + self-reference | Fewer tables | Loses type safety, RLS harder, query complexity | Reject |

### 2.3 Ordering & Navigation

- `order_index INTEGER NOT NULL` on units, lessons, exercises; unique per parent.
- User preference table: `user_preferences { user_id PK, navigation_mode: 'linear'|'free', progression_mode: 'unlocked'|'locked', locale, theme, ... }` — persisted, read on session bootstrap.
- Linear mode: UI enforces sequential rendering + previous/next; free mode: grid/catalog with filters. Both modes read same data; difference is presentation + client-side guard.
- Placement test: separate entity `placement_tests` + `placement_questions` + `placement_attempts` with scoring → recommended `level_id`. Result stored but never auto-enrolls; user confirms.

### 2.4 Level Content Volume (Initial Bank Generation)

| Level | Units | Lessons/Unit | Exercises/Lesson | Total Exercises | Notes |
|-------|-------|--------------|------------------|-----------------|-------|
| A1 | 8 | 8 | 8 | 512 | Highest volume — foundation |
| A2 | 8 | 8 | 8 | 512 | |
| B1 | 8 | 8 | 10 | 640 | More open tasks |
| B2 | 8 | 8 | 10 | 640 | |
| C1 | 6 | 8 | 10 | 480 | Graded readings longer |
| C2 | 6 | 8 | 10 | 480 | Academic/professional |
| **Total** | **44** | — | — | **~3,264** | Manageable seed via script + AI assist |

Seed strategy: curated templates per exercise type x rule-driven generation + LLM refinement (free tier, batched, reviewed).

---

## 3. Exercise Engine

### 3.1 Required Types (from discovery)

All required: **grammar, vocabulary, listening, reading, writing, speaking** (strongest focus). Exercise types: fill-blanks, ordering (sentence/paragraph), transformation (rephrase), flashcards with images, matching (pairs), audio with native TTS, dictation, comprehension Q&A, graded readings, open writing prompts with AI correction, speaking: record audio, shadowing, pronunciation scoring. Hybrid: curated question bank + generative AI exercises.

### 3.2 Engine Alternatives

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Strategy pattern per exercise type** (`ExerciseRenderer` registry, `ExerciseEvaluator` per type) | Extensible, testable, granular slicing | Slight upfront abstraction | **Recommended** |
| Single monolithic evaluator with switch/case | Simple initially | Becomes unmaintainable at 12+ types | Reject |
| Headless CMS (Strapi/Sanity) for exercises | Non-dev content editing | Extra infra, free-tier limits, couples to external | Reject — keep in Supabase |

### 3.3 Data Model Sketch

```sql
exercises (
  id uuid PK,
  lesson_id uuid FK,
  type text CHECK (type IN ('fill_blanks','ordering','transformation','flashcard','matching','listening_tts','dictation','comprehension','graded_reading','writing_prompt','speaking_record','shadowing','pronunciation')),
  difficulty int 1-5,
  prompt jsonb,        -- type-specific payload
  solution jsonb,      -- canonical answer(s)
  assets jsonb,        -- images, audio URLs, etc.
  ai_generated boolean default false,
  version int, created_at, updated_at
)
attempts (
  id uuid PK, user_id uuid FK, exercise_id uuid FK,
  answer jsonb, score numeric, feedback jsonb,
  time_spent_ms int, created_at
)
```

- `prompt`/`solution` JSONB keeps type-specific schema flexible while allowing Zod validation per type on app layer.
- Index on `(lesson_id, type)` and GIN on `prompt`.

### 3.4 Hybrid Bank + Generative

- **Curated bank** is source of truth (versioned, reviewed).
- **Generative** exercises: created on-demand via provider-agnostic LLM adapter (see §5), flagged `ai_generated=true`, rate-limited, cached, optionally persisted if user saves.
- Limits: free LLM quotas (~few hundred req/day). Mitigation: cache aggressively, pre-generate batches offline, prefer deterministic templates where possible.

---

## 4. Speaking — Free Implementation (Critical Path)

Speaking MUST be solid; strongest focus. Must stay on free tier.

### 4.1 Options Evaluated

| Option | Cost | Quality | Latency | Browser Support | Privacy | Verdict |
|--------|------|---------|---------|-----------------|---------|---------|
| **Browser Web Speech API (SpeechRecognition + SpeechSynthesis)** | Free, no quota | Good for A1-B2, weaker for accent scoring | Low | Chrome/Edge ~95%, Safari partial, Firefox limited | Audio stays local | **Primary (Phase 1)** |
| Web Audio + VAD + local WASM (e.g., whisper.cpp via WASM) | Free | Better scoring potential offline | Higher initial load | Evergreen browsers | Local | Future enhancement, not Slice 1 |
| Cloud ASR (Google/Azure/AWS STT) | Paid after free minutes | Excellent | Low | All | Audio sent to cloud | Reject (violates zero-paid) |
| Cloud LLM pronunciation scoring (e.g., ELSA API) | Paid | Excellent | Medium | All | Cloud | Reject |

### 4.2 Recommended Architecture

```
SpeakingService (interface)
├── WebSpeechAdapter  (SpeechRecognition + SpeechSynthesis)  ← Slice 1-2
├── WasmWhisperAdapter (optional future)                     ← Slice 3 stretch
└── MockAdapter (tests, unsupported browsers)
```

- `SpeakingService` interface: `startRecording()`, `stopRecording(): Promise<Transcript>`, `speak(text, voice, rate)`, `scorePronunciation(reference, transcript): Score`, `isSupported(): boolean`.
- TTS: `speechSynthesis` with voice selection + rate/pitch (native voices are free). Graded by Web Speech availability table (see Risks).
- Scoring (free-tier heuristic): Levenshtein distance on normalized transcript vs reference + word-level WER + optional lightweight phoneme heuristic. Sufficient for A1-B2; C1-C2 advanced scoring deferred to LLM-assisted textual feedback (not acoustic).
- Shadowing: play reference audio (TTS) → user repeats → transcribe → score → visual diff.
- Failure mode for unsupported browsers: graceful degradation — show transcript input fallback, explain limitation, offer to type instead.

### 4.3 Audio Storage

- Recorded blobs stored transiently in memory / IndexedDB for review; optional upload to Supabase Storage (free 1GB) if user enables history. Default: do NOT persist audio to save quota.

---

## 5. AI Tutor & Generative Abstraction (Provider-Agnostic, Free Tier)

### 5.1 Requirements

- Virtual AI tutor guides all skills; open writing correction; generative exercises; conversational practice.
- Must stay on free tier; swappable providers via abstraction.

### 5.2 Provider Comparison (Free Tier as of 2026)

| Provider | Free Tier | Vercel AI SDK Support | Notes |
|----------|-----------|----------------------|-------|
| **OpenRouter** | Free models (e.g., `meta-llama/llama-3.1-8b:free`, `google/gemini-flash:*` free variants) | Yes (`@ai-sdk/openai` compatible) | Aggregates multiple free models, fallback pool — **recommended primary** |
| **Groq** | Generous free (rate-limited, fast inference) | Yes | Good fallback, `llama-3.1-8b-instant` |
| **Browser-local LLM (WebLLM)** | Free, offline | No (custom) | Heavy (~2-4GB), future stretch |
| Direct OpenAI / Anthropic | No free tier (trial only) | Yes | Reject for ongoing use |

### 5.3 Abstraction

```ts
interface TutorProvider {
  chat(messages: Message[], opts?: ChatOpts): Promise<ChatResponse>;
  correctWriting(prompt: string, userText: string): Promise<CorrectionResult>;
  generateExercise(spec: ExerciseSpec): Promise<ExercisePayload>;
  isAvailable(): Promise<boolean>;
}
class ProviderRouter implements TutorProvider {
  // tries primary → fallback pool, handles rate limits, caches
}
```

- Use **Vercel AI SDK v5** (`ai` + `@ai-sdk/openai` compatible) as unified interface — provider switch is config-only.
- Env-driven: `AI_PROVIDER=openrouter|groq|mock`, `AI_MODEL=...`, `AI_FALLBACK_MODELS=...`.
- Caching: Upstash Redis free or in-memory + Supabase table for prompt/response cache (hash of prompt → response, TTL).
- Rate limiting: token bucket per user (e.g., 20 tutor messages/day on free tier), queue + retry with backoff.
- Safety: content filter + system prompt constrains to pedagogy; no disallowed content.

---

## 6. SRS (Spaced Repetition) Algorithm

### 6.1 Requirement

Optional per user: spaced repetition (Anki-like), daily reviews, manual topic review — all optional.

### 6.2 Algorithm Alternatives

| Algorithm | Complexity | Efficacy | Implementation | Verdict |
|-----------|------------|----------|----------------|---------|
| **SM-2 (Anki classic)** | Low | Proven | Simple interval/ease calculation | **Recommended (Slice 2)** |
| SM-5 / FSRS (modern) | Medium-High | Slightly better | More params, harder to tune | Defer — evaluate after SM-2 ships |
| Leitner boxes | Very low | Coarser | 5 boxes | Adequate but less granular than SM-2 |

### 6.3 SM-2 Sketch

```
Card { id, user_id, exercise_id/vocab_id, interval, ease_factor, repetitions, due_date, lapses }
On review (quality 0-5):
  if q >= 3: repetitions++, interval = f(interval, ease_factor, repetitions), ease_factor += delta(q)
  else: repetitions = 0, interval = 1 (re-learn)
due_date = today + interval days
```

- Daily reviews: cron-like query `where due_date <= today and user_id = X` — triggered on app open + optional email.
- Manual topic review: user picks unit/lesson → filter cards by `exercise.lesson.unit`.
- Storage: `srs_cards` + `srs_reviews` (history). Indexed on `(user_id, due_date)`.
- PWA offline: cards cached in IndexedDB; sync on reconnect.

---

## 7. Gamification

### 7.1 Mechanics

XP, levels, streaks, badges, leaderboard, shop/avatar store (cosmetic), streak challenges.

### 7.2 Design Choices

- **XP**: per exercise `xp = base * difficulty * time_bonus * streak_multiplier`; idempotent per attempt (no double-count on retry unless configured).
- **Levels**: curve `level = floor(sqrt(xp / 100))` or table-driven thresholds (tunable). Cosmetic + unlocks shop items.
- **Streaks**: `user_streaks { user_id, current_streak, longest_streak, last_activity_date }`; streak increments if any activity that day; freeze item in shop.
- **Badges**: rule engine (`BadgeRule { id, predicate: (userStats) => boolean }`) evaluated on progress events; stored in `user_badges`.
- **Leaderboard**: weekly + all-time; materialized query `top N by xp in window`; cached (5-min TTL). Privacy: display name or anonymized.
- **Shop/Avatar**: `shop_items { id, price_xp, cosmetic_type, asset_url }` + `user_inventory`. No real money — XP currency only; paywall placeholders for future monetization.

### 7.3 Scaling Note

Leaderboard at 5 users is trivial; design supports 50k+ by paginated queries + index on `(xp)`.

---

## 8. i18n

### 8.1 Requirement

UI toggle ES/EN fully user-switchable, easy to modify.

### 8.2 Alternatives

| Library | App Router Support | Type Safety | DX | Verdict |
|---------|-------------------|-------------|----|---------|
| **next-intl** | First-class (RSC, middleware) | Good | Simple JSON namespaces | **Recommended** |
| next-i18next | Legacy, pages-centric | OK | Heavier, i18next dependency | Reject |
| next-international | Lightweight | OK | Less mature | Reject |

- Structure: `messages/{en,es}/common.json`, `.../exercises.json`, `.../gamification.json`. Namespace per feature.
- `UserPreferences.locale` drives default; toggle in header persists to DB + cookie for SSR.
- Easy modification: single JSON per locale — non-dev can edit.

---

## 9. PWA Offline

### 9.1 Requirement

PWA offline for reviews; mobile-first; dark mode.

### 9.2 Alternatives

| Library | Workbox Integration | App Router Support | Maintenance | Verdict |
|---------|---------------------|--------------------|-------------|---------|
| **Serwist (Workbox successor)** | Native | Good (next-pwa successor path) | Active | **Recommended** |
| next-pwa (classic) | Workbox | Good | Maintenance slowed, fork to `serwist` | Fallback |
| Custom Workbox | Manual | Manual | Most control, most work | Overkill |

- Strategy: `serwist` with `next.config.js` integration.
- Caching: App shell (cache-first), API/exercises (network-first with cache fallback), SRS cards + IndexedDB (offline-first), audio TTS (no cache — generated), images (stale-while-revalidate).
- Offline scope: reviews, flashcards, previously visited lessons. Writing/speaking that needs LLM → queued when offline, warns user.
- Install prompt + offline indicator.

---

## 10. Supabase Free Tier Limits & Mitigations

### 10.1 Quotas (as of 2026, verify in Supabase dashboard)

| Resource | Free Limit | Our Usage @5 users | Headroom | Mitigation |
|----------|------------|-------------------|----------|------------|
| Database size | 500 MB | ~20-50 MB (text-heavy) | Large | Compress assets, store images in Supabase Storage or CDN, avoid storing audio blobs |
| Auth MAU | 50,000 | 5 | Huge | No issue |
| Storage | 1 GB | <100 MB (avatars, uploads) | Large | Use external CDN for exercise images if needed |
| Edge Functions invocations | 500k / month | Low (tutor proxy) | Large | Cache AI responses |
| Realtime connections | 200 concurrent | Unused initially | — | Not needed for v1 |
| Bandwidth | 5 GB / month | <1 GB | Safe | Optimize images (next/image), cache |
| Row limit | Soft (performance) | ~10k rows initially | Safe | Index well |

- RLS: mandatory for all tables; policies per `auth.uid() = user_id` for user data, public read for content (levels/units/lessons/exercises).
- Backups: Supabase daily PITR on free is limited; additionally export seed SQL to repo.

### 10.2 ORM Alternatives

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Prisma + supabase-js (hybrid)** | Prisma DX + migrations + type-safe client; supabase-js for Auth/Realtime/Storage | Two clients to manage, but small surface | **Recommended** — Prisma for Postgres, supabase-js for Auth/Storage |
| supabase-js only (no Prisma) | Single client, RLS-native | No Prisma Migrate, less type-safe for complex joins | Viable alternative — choose if team prefers simplicity |
| Drizzle ORM | Lightweight, SQL-like, good RLS | Smaller ecosystem, fewer examples | Consider if Prisma feels heavy — acceptable substitute |
| Pure SQL migrations | Full control | No ORM DX | Overkill |

Decision: **Prisma for data modeling + migrations + typed queries; supabase-js for Auth, Storage, and RLS-aware client where needed.** If the team later drops Prisma, migration path to `supabase-js` alone is straightforward (tables remain).

---

## 11. Tech Stack Recommendation (Consolidated)

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | **Next.js 15 App Router** | Required, RSC, Server Actions, PWA-ready |
| Language | **TypeScript strict** | Required |
| Styling | **Tailwind CSS 4** (+ `cn()` via `clsx`+`tailwind-merge`) | Required, mobile-first |
| DB | **Supabase Postgres (free)** | Required |
| ORM | **Prisma** + **supabase-js** | Best DX + Auth/Storage coverage |
| Auth | **Supabase Auth (email+password)** | Required, RLS integration |
| i18n | **next-intl** | Best App Router support |
| PWA | **Serwist** (fallback `next-pwa`) | Active maintenance, Workbox successor |
| AI | **Vercel AI SDK 5** + **OpenRouter (primary) / Groq (fallback)** + provider abstraction | Free-tier, swappable |
| Speech | **Web Speech API** (primary) + abstraction layer | Zero cost, local |
| Email | **Resend** or **Supabase Auth emails** | Free tier (Resend 3k/mo, Supabase built-in) |
| State (client) | **Zustand 5** (lightweight) or React Context | Minimal global state (prefs, gamification) |
| Validation | **Zod 4** | Type-safe schemas, works with Server Actions |
| Deployment | **Vercel** + **GitHub (gh cli)** | Required |
| Testing | **Vitest + Testing Library + Playwright** | As per config.yaml |

---

## 12. Risks & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| R1 | **AI cost / rate limits** (free LLM quotas) | Tutor & exercise generation stops | Medium | Provider router + fallbacks + aggressive caching + per-user rate limits + template-first generation + pre-batched seeds |
| R2 | **Content volume** (~3.2k exercises from scratch, quality across A1-C2) | Delays launch, uneven quality | High | Slice content: A1-A2 first; templates per type; AI-assisted drafting + human review gate; seed scripts with Zod validation; admin CRUD for iteration |
| R3 | **Web Speech browser support gaps** (Safari/Firefox STT) | Speaking broken for subset | High | Feature detection + graceful fallback (type transcript) + `isSupported()` UI; abstraction allows WASM future without rewrite |
| R4 | **Supabase free quotas (500MB, bandwidth)** | App throttled or paused | Low at 5 users | Avoid storing audio, compress images, cache AI, monitor usage dashboard, document upgrade path + paywall placeholders |
| R5 | **PWA offline sync conflicts** | Stale progress, lost attempts | Medium | IndexedDB + background sync + last-write-wins for SRS; server reconciliation on reconnect; offline indicator |
| R6 | **Scope creep (universal audience → too many personas)** | Design becomes generic, unfocused | Medium | Slice by CEFR, not persona; keep UI simple with progressive disclosure; future persona filters are additive |
| R7 | **Email deliverability (Resend free 3k/mo)** | Notifications land in spam | Low | Use Supabase Auth emails for transactional; Resend for digests; double opt-in; plain-text fallback |
| R8 | **Leaderboard/gamification abuse** | Farming XP | Medium | XP idempotency, time-spent checks, rate limits, server-side scoring |

---

## 13. Slice Strategy (Preview — Detailed in proposal.md)

- **Slice 1 — A1-A2 Core + Full Exercise Types + Evaluations** (largest slice, foundation): auth, CEFR navigation (linear/free toggle), all 13 exercise types minimally, listening/reading/writing/speaking (Web Speech baseline), virtual tutor (mock + OpenRouter wiring), quiz per lesson + level exam, gamification baseline (XP/streaks/badges), shop stub, dark mode, responsive.
- **Slice 2 — B1-B2 + Challenges + SRS**: B-level content, daily/weekly/timed/streak/competitive challenges, SRS SM-2 + daily reviews + manual review, email notifications, leaderboard, i18n polish.
- **Slice 3 — C1-C2 + Speaking Advanced + Admin + Polish**: C-level content (academic/professional), pronunciation scoring polish + shadowing variants, informal badges (no official cert), full admin CRUD (content, users, moderation), PWA offline polish, paywall placeholders for monetization.

Each slice further decomposable into **sub-slices < 100 lines** (see `tasks.md` Review Workload Forecast).

---

## 14. Open Questions (Resolved or Deferred)

| Question | Resolution |
|----------|------------|
| SQLite vs Supabase? | Supabase (per discovery override) — SQLite mention removed |
| Prisma vs supabase-js? | Hybrid: Prisma for domain, supabase-js for Auth/Storage |
| next-pwa vs Serwist? | Serwist primary, next-pwa as fallback |
| Certificate official? | No — informal achievement badges only |
| Teachers role? | No — student + admin only |
| Placement test mandatory? | No — optional, user-initiated |

---

## 15. Next Step

Proceed to `proposal.md` (change intent, scope, approach, risks, success criteria, slice strategy for auto-chain).
