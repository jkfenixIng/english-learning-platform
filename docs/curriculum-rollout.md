# Curriculum Rollout — PRD Strict 72/72/24 (feat: generador-lecciones-quizzes-evaluaciones)

Runbook for staged delivery of PRD strict curriculum (72 lessons / 72 quizzes 5Q / 24 evaluations 15Q 4/6/5) while preserving legacy 188-lesson path behind flag.

## Flag & defaults

- `CURRICULUM_MODE` env: `legacy` (default) | `prd_strict`.
- Code: `lib/curriculum/config.ts` `getCurriculumMode()` — reads env, defaults `legacy`.
- API: `GET /api/curriculum/meta` exposes active mode (header `x-curriculum-mode` for clients).
- Prod default stays `legacy` until content QA passes; `prd_strict` is opt-in via env or `?mode=prd_strict`.
- Kill-switch: redeploy with `CURRICULUM_MODE=legacy` instantly reverts to 188 lessons (no DB delete).

## Phases 0–3

| Phase                       | What                                                                                                                                                                                                         | Gate                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **0 Scaffolding**           | `config.ts`, `schemas/curriculum.prd.json`, `schema.ts`, `imageNaming`/`imageResolver`, nullable Prisma `Exercise.category                                                                                   | evaluationSlot`, `curriculum:validate` stub                                                                         | `prisma validate` + `typecheck` pass |
| **1 Flagged generator MVP** | `lessonGenerator` 72, `quizGenerator` 5Q (B/C truncate → `quarantine/`), `evaluationGenerator` 15Q 4/6/5, seededRng deterministic, seed branching in `prisma/seed.ts` behind flag                            | `curriculum:generate --mode prd_strict --seed 42` → 72/72/24, Zod ok, hash stable                                   |
| **2 Content QA & alias**    | IPA backfill `needs_review` queue, `image_alias.json` 72 lesson aliases + 151 eval refs fallback to `teaching-placeholder.png`, audit hit rate 100%, editorial review of vocab IPA & evaluation prompts      | `curriculum:verify-images` 0 unresolved (72 aliased +151 eval placeholder), `curriculum:audit` 96/144/120, 0 failed |
| **3 Cutover & sunset**      | Switch prod `CURRICULUM_MODE=prd_strict` after QA sign-off; run `migrate-progress --apply` for completion carryover; deprecate `unit` → `moduleId` DTO (keep alias 1 release); sunset `legacy` after 1 cycle | E2E idempotency `hash stable` + legacy regression `188 lessons` still green, then remove flag                       |

## Verification commands

```bash
# PRD strict — must all PASS
npm run typecheck
npm run lint
npm test
npx tsx scripts/curriculum-generate.ts --mode prd_strict --seed 42
npx tsx scripts/curriculum-generate.ts --mode prd_strict --seed 42 --out /tmp/a.json
npx tsx scripts/curriculum-generate.ts --mode prd_strict --seed 42 --out /tmp/b.json && diff /tmp/a.json /tmp/b.json
npx tsx scripts/curriculum-idempotency.ts
npx tsx scripts/curriculum-audit.ts --mode prd_strict --seed 42
npx tsx scripts/curriculum-verify-images.ts --mode prd_strict
npx tsx scripts/curriculum-verify-images.ts --mode legacy

# Legacy regression — must still PASS
CURRICULUM_MODE=legacy npm test
npx tsx scripts/curriculum-verify-images.ts --mode legacy   # 180 legacy files +72 aliases
npx tsx scripts/curriculum-generate.ts --mode legacy        # no PRD invariants
```

Hash reference (seed 42): `57d7b010db1c0fc0` for `{lessons,quizzes,evaluations}` payload.

## CI gates

- `curriculum:validate --mode prd_strict` — fails on count mismatch, schema divergence, distribution drift (added to `.github/workflows/ci.yml` prd gate job).
- `curriculum:verify-images --mode prd_strict` + `--mode legacy` — fails on `UNRESOLVED_IMAGE_REF`.
- `curriculum:audit --mode prd_strict --seed 42` — fails if any evaluation not 4/6/5 or totals not 96/144/120.
- `curriculum:idempotency` (or generate twice diff) — fails if hash not stable.
- Existing tests matrix still runs with `CURRICULUM_MODE=legacy` implicit (no `MISSING_IPA` enforced).

## Rollback

1. Set `CURRICULUM_MODE=legacy` in env (Vercel/env var) and redeploy.
2. No DB migration needed — `prd_strict` seed prunes `orderIndex gt 4` but re-seeding legacy recreates them (idempotent upsert restores 6x6x5 + exams@99).
3. Progress: `scripts/migrate-progress.ts --dry-run` shows orphan map; no automatic credit — resume from closest prd lesson or manual admin adjustment.

## Migration notes: legacy 188 → PRD 72

Run `pnpm curriculum:migrate-progress` (dry-run):

- **Mapped 72**: `A1-u1-l1..3` → `a1_m1_l1..3` etc for units 1-4 lessons 1-3.
- **Pruned 108 teach**: `u5,u6` (60) + `l4,l5` in retained units (48) → `pruned_unit` / `pruned_lesson` — logged as orphan.
- **Exams**: legacy `orderIndex 99` (6 finals +2 C part2 =8) → prd `orderIndex 4` per module (`moduleId a1_m1` etc) — note `legacy level exam -> prd module m1 evaluation`.
- Strategy: do not auto-grant completion for pruned lessons; surface in UI as “legacy progress” or grant XP placeholder (product decision). `--apply` wiring is opt-in and requires `DATABASE_URL` + `Progress` table mapping.

## Image alias coverage

- **72 lesson images**: `a1_m1_img_l1.png` → `lessons/a1-u1-l1.png` etc in `public/lesson-images/image_alias.json` — verified via `imageResolver` canonical-first + alias fallback (`[ALIASED]` log). 180 legacy files present.
- **151 evaluation images**: `*_img_eval_r*.png` (96 reading) + `*_audio_eval_l*.png` (~55 listening) from `evaluationGenerator` — **placeholder is intentional until assets produced**. Manifest `image_alias.json` now includes all 151 eval canonicals mapped to `teaching-placeholder.png` (explicit alias, not implicit fallback) so `verify-images` counts them as `ALIASED` not `UNRESOLVED` (`eval refs total=151 aliased=151 unresolved=0`). `imageResolver` also falls back to `teaching-placeholder.png` for any missing `*_eval_*` ref, ensuring no 404 in strict mode. When production images are ready, run `migrate-images --copy-alias` to replace placeholder aliases with canonical files (phase 2).
- **Quarantine**: B/C quiz truncation logs (`quarantine/quiz-*.json`) are gitignored and not committed; they hold dropped questions for manual promotion.

## Sunset plan

- Keep `unit` → `moduleId` DTO alias one release after cutover (deprecated field).
- Keep `legacy` codepath one release after cutover behind flag, then remove `getCurriculumMode` branch and `image_alias.json` legacy fallback (canonical files will exist).
- Keep `Variate` IPA `needs_review` queue until pedagogy confirms IPA dictionary coverage >95% (currently 27 curated +119 fallback 0.3).

## Idempotency

- `generateLessons(42)` + `generateQuizzes` + `generateEvaluations(42)` seeded via `mulberry32` — byte-identical re-runs (`tests/curriculum-idempotency.test.ts`).
- `prisma/seed.ts` `seedPrdStrict` upserts by `unitId+orderIndex` and reuses `findFirst+deleteMany gt4` — second run with same seed yields 0 DB diff (file-level idempotency test writes `/tmp/*.json` and diffs).
- `quarantine/` holds B/C truncated questions but is gitignored and not part of hash — hash over `{lessons,quizzes,evaluations}` stable `57d7b010`.

## Owners & sign-off

- Content QA: pedagogy team — IPA + evaluation 4/6/5 quality gate.
- Eng: verify `typecheck lint test curriculum:*` green before prod flag flip.
- Rollback approver: eng lead — single env var revert; no data loss (orphan progress retained).
