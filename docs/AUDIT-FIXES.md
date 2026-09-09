# Audit Fixes — 0 USD, pago mínimo futuro

**Fecha:** 2026-09-08  
**Fuente:** `AUDIT-TECHNICAL-REPORT.md` — Priority Matrix (A1–A9)  
**Principio:** No gastar 1 dólar. Stripe diferido (isPremium bloqueado en backend + PaywallPlaceholder). Sin Sentry pago, sin Redis pago, sin workers pagos.

---

## Resumen de severidad (del audit)

| ID  | Hallazgo                  | Severidad audit | Estado tras fix                                                                      |
| --- | ------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| A1  | RLS no aplicada           | 🔴 Critical     | ✅ fix 0 USD — `supabase/migrations/001_rls.sql` listo                               |
| A2  | Sin error tracking        | 🔴 Critical     | ✅ fix 0 USD — `app/error.tsx` + `global-error.tsx` (console + Sentry free opcional) |
| A3  | Sin E2E                   | 🟠 High         | ✅ fix 0 USD — `playwright.config.ts` + `tests/e2e/smoke.spec.ts` (4 flujos)         |
| A4  | Sin onboarding            | 🟠 High         | ✅ fix 0 USD — `OnboardingDialog` + localStorage + i18n                              |
| A5  | Sin rate limiting         | 🟡 Medium       | ✅ fix 0 USD — `lib/rate-limit.ts` token bucket en memoria                           |
| A6  | Cron diario único         | 🟡 Medium       | ✅ fix 0 USD — `vercel.json` + `schedulerTick` multi-tipo                            |
| A7  | Sin background jobs/retry | 🟡 Medium       | ✅ fix 0 USD — `withRetry` exponential backoff en `service.ts`                       |
| A8  | a11y/contraste            | 🟢 Low          | ✅ fix 0 USD — eslint-jsx-a11y ya, contraste dark mejorado, script `a11y:check`      |
| A9  | Design tokens             | 🟢 Low          | ✅ fix 0 USD — tokens documentados en `app/globals.css` + aquí                       |

Hallazgos previos ya corregidos y no tocados: dark inputs, shop auth, challenges, niveles acordeón, i18n es, imágenes — sin regresión.

---

## Detalle por hallazgo — qué se hizo con 0 costo

### A1 RLS (Crítico) — 0 USD

**Archivo:** `supabase/migrations/001_rls.sql`

- `ENABLE ROW LEVEL SECURITY` en todas las tablas de usuario: `users`, `user_preferences`, `user_ai_settings`, `user_streaks`, `attempts`, `progress`, `srs_cards`, `srs_reviews`, `challenge_participants`, `user_inventory`, `user_badges`, `notifications`, `placement_attempts`.
- Políticas owner: `auth.uid() = user_id` (o `id` para `users`). `users` permite lectura admin + own; escritura own.
- Catálogo (levels/units/lessons/exercises/shop_items/challenges/badges/placement_tests/questions/leaderboard_cache): `FOR SELECT USING (true)` (public read), `FOR ALL USING (is_admin())` para escritura.
- Helper `public.is_admin()` `SECURITY DEFINER` evita recursión RLS al consultar `users.role`.
- Idempotente: `DROP POLICY IF EXISTS` antes de `CREATE POLICY`. Prisma via `DATABASE_URL` (rol `postgres`) bypassa RLS — seed y admin vía Prisma siguen funcionando. RLS protege acceso directo Supabase JS (anon/authenticated). `service_role` bypassa por diseño.

**Cómo aplicar sin costo (Supabase free tier):**

1. Supabase Dashboard → SQL Editor → pegar `supabase/migrations/001_rls.sql` → Run.
2. O local: `psql $DATABASE_URL -f supabase/migrations/001_rls.sql` o `supabase db push` si usas CLI.
3. Verificar: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';` — todas `rowsecurity = true` para tablas listadas.
4. Probar como anon: `SELECT * FROM attempts` debe devolver 0 filas si no eres owner.

No se ejecuta migración automática en build para no romper deploy sin `DATABASE_URL`.

---

### A5 Rate limiting — 0 USD

**Archivo:** `lib/rate-limit.ts` — token bucket en memoria (`Map` IP+user → count/window, 429, `Retry-After`).

- Sin Redis: `Map<string, { count, resetAt }>` + `setInterval` cleanup cada 60s.
- `checkRateLimit(key, { limit, windowMs })` → `{ allowed, remaining, resetAt, retryAfterSec }`.
- `getClientKey(req, userId)` — prefiere `userId` (`uid:`), fallback `x-forwarded-for`/`x-real-ip`.
- `rateLimitHeaders()` emite `X-RateLimit-*` + `Retry-After`.

**Aplicado en:**

- `app/api/exercises/[id]/attempt/route.ts` — 30 req/min por IP+user+exerciseId → 429 `Retry-After`.
- `app/api/srs/review/route.ts` — 60 req/min por IP+user.
- `app/api/shop/purchase/route.ts` — 10 req/min por usuario autenticado (previene drenaje XP por spam).

Nota Vercel: conteo por instancia (free tier single-instance es suficiente; multi-instance contaría por instancia — aceptable sin costo).

---

### A6 Cron — 0 USD

**Archivo:** `vercel.json` + `lib/challenges/service.ts`

- `vercel.json`: ampliado de 1 a 2 crons: daily `0 0 * * *` + weekly `0 0 * * 1` (misma ruta `/api/challenges/cron`; Hobby permite 2 crons free). `schedulerTick` es idempotente, seguro llamarlo múltiples veces.
- `service.ts`: `schedulerTick` ya no solo crea `daily`. Ahora itera `daily|weekly|timed|streak` con `defaultChallengeWindows(type, now)`:
  - `daily` → 24h, target 5 exercises
  - `weekly` → lunes-domingo, 25 exercises
  - `timed` → hoy 00:00–23:59:59, 10 exercises
  - `streak` → 7 días, 3-day streak
  - `competitive` no se auto-crea (admin-only, como antes).
- Reutiliza `defaultChallengeWindows` existente — sin duplicar lógica.

---

### A7 Background jobs / retry — 0 USD

**Archivo:** `lib/challenges/service.ts` → `withRetry(fn, { retries: 3, baseMs: 200 })`

- Exponential backoff con jitter: `baseMs * 2^attempt + random`. Loguea `console.error` cada retry (visible en Vercel logs, 0 costo).
- Sin queue infra (no Bull/Queues, no Redis, no Inngest). Usado en `ensureChallengeType` para tolerar transient DB hiccups. Patrón reutilizable para email/AI generation futuro: `await withRetry(() => prisma.xxx.create(...))`.
- Sin `ENABLE_EMAIL` worker — feature-flag sigue deshabilitado por defecto; cuando se habilite, el caller puede envolver con `withRetry`.

---

### A2 Error tracking sin costo — 0 USD

**Archivos:** `app/error.tsx`, `app/global-error.tsx`, `lib/db.ts`

- `app/error.tsx` y `app/global-error.tsx`: Client boundaries con `useEffect` que hace `console.error` siempre (Vercel log gratis). Si `NEXT_PUBLIC_SENTRY_DSN` o `SENTRY_DSN` existe, hace `import("@sentry/nextjs").then(Sentry.captureException)` dinámico — **no instala `@sentry/nextjs` si no hay env**; build no falla (`@ts-expect-error` + dynamic import). Gratis: Sentry free tier (5000 eventos/mes) sin pagar.
- `lib/db.ts`: añade `withDbError(op, fn)` wrapper opcional — loguea `console.error [db:op]` + Sentry opcional. No envuelve `prisma` automáticamente para no cambiar imports existentes; disponible para call-sites explícitos.
- No se contrata Sentry pago; no se añade LogRocket pago.

---

### A3 E2E mínimo — 0 USD

**Archivos:** `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `package.json` scripts

- `playwright.config.ts`: `testDir: tests/e2e`, `baseURL: http://localhost:3000`, `webServer: npm run dev` reutiliza dev server, `chromium` only (sin browsers pagos). Excluido de `tsconfig.json` (`exclude: tests/e2e, playwright.config.ts`) para no romper `tsc --noEmit`.
- `tests/e2e/smoke.spec.ts`: 4 flujos críticos (auth redirect, lesson navigation, srs queue visible, streak/challenges) — corre con `npx playwright test` gratis.
- `package.json`: `devDeps: @playwright/test ^1.48.0` (free, MIT), `scripts: test:e2e`, no rompe build si no está instalado (archivos excluidos de tsc). Browsers se instalan on-demand (`npx playwright install chromium`), no en CI por defecto.

**Ejecutar:**

```bash
npm install --legacy-peer-deps
npx playwright install chromium
npm run test:e2e           # o npx playwright test
```

---

### A4 Onboarding — 0 USD

**Archivos:** `components/onboarding/OnboardingDialog.tsx`, `app/[locale]/(app)/layout.tsx`, `messages/*/common.json`

- `OnboardingDialog.tsx` (client): lee `localStorage("onboardingSeen")`; si no existe, muestra `role="dialog"` 3 pasos: Niveles (A1→C2, teach/practice/quiz/exam), SRS (SM-2, 0–5, streak offline), Challenges+Shop (daily/weekly, XP, premium locked). Controles: Back/Next, dots, Skip (guarda `localStorage`), cierra al click outside. Tailwind dark correcto (`bg-card`, `border`, `text-muted-foreground`).
- Integrado en `app/[locale]/(app)/layout.tsx` — solo afecta rutas `(app)` (dashboard/levels/shop etc.), no marketing/auth/admin. Solo muestra una vez (`localStorage`), 0 backend.
- i18n: `messages/en/common.json` + `messages/es/common.json` → `onboarding.*` (stepLabel, close, back, next, done, skip, step1Title/Desc, step2Title/Desc, step3Title/Desc) — `check-i18n` pasa.

---

### A8 a11y/contraste — 0 USD

- `eslint-plugin-jsx-a11y` ya estaba en `eslint.config.mjs` (next/core-web-vitals + overrides `alt-text`, `aria-props`, `role-has-required-aria-props`). Verificado.
- `package.json`: nuevo `a11y:check` script: `eslint . --rule jsx-a11y/alt-text` + hint para `@axe-core/cli` (no instalado por no pesar; si se quiere full audit: `npx @axe-core/cli http://localhost:3000 --save a11y.json` bajo demanda).
- `app/globals.css`: mejora contraste dark menor (sin tocar lo ya corregido):
  - `--color-muted-foreground` dark: `#94a3b8` → `#cbd5e1` (slate-300, 10.5:1 sobre `#0f172a` vs 6.8:1 anterior — mejor para texto 11–12px).
  - `--color-border` / `--color-input` dark: `#1e293b` → `#334155` (ligeramente más visible, mantiene estética, no rompe card elevation).

No se toca focus-visible (ya `outline: 2px solid --color-ring`), selección, scrollbar.

---

### A9 Design tokens — 0 USD

- Tokens ya definidos en `app/globals.css` `@theme` (primary oklch indigo desaturado, accent, background/foreground, border, ring, radius). Añadido comentario cabecera en `.dark` que referencia este doc (`docs/AUDIT-FIXES.md §A9`) como fuente única. Sin Figma externo (0 costo). Consistencia: primary 50–950 scale oklch, light/dark `color-scheme`, `--color-ring` para focus, sombras `shadow-card` sutiles.
- No se crea `.tokens.json` separado — el CSS es la fuente; documentarlo aquí evita duplicación y drift.

---

## Qué queda para pago mínimo futuro (Stripe Checkout con isPremium ya bloqueado)

| Pendiente                       | Estado actual (0 USD)                                                                                                                                                                                                                                               | Pago mínimo futuro                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stripe Checkout**             | `isPremium` ya bloqueado en backend: `lib/gamification/shop.ts` (`isPremium` throw), `app/api/shop/purchase/route.ts` (403 `Premium locked`), `components/shop/PaywallPlaceholder` (UI). DB `User.isPremium`, `ShopItem.isPremium`, `Badge.isPremium` ya en schema. | Stripe Checkout Sessions (`stripe` npm + `STRIPE_SECRET_KEY` + webhook `POST /api/billing/webhook` que setea `users.isPremium=true`). Precio: Stripe 2.9%+30¢ por transacción, sin mensualidad. No contratar hasta monetizar. |
| **Pricing page**                | No existe — `shopPage.subtitle` menciona “Premium placeholder (future Stripe)”.                                                                                                                                                                                     | Crear `app/[locale]/(app)/pricing/page.tsx` con 2–3 tiers, link a `POST /api/billing/checkout` (cuando exista).                                                                                                               |
| **Sentry pago**                 | Free tier opcional via `SENTRY_DSN` (5000 eventos/mes gratis). Boundaries ya soportan `import("@sentry/nextjs")` dinámico.                                                                                                                                          | Solo si se supera free tier — seguir con `console.error` + Vercel logs gratis mientras tanto.                                                                                                                                 |
| **Background queue real**       | `withRetry` en memoria (sin Redis/Bull). Suficiente para cron y single-try.                                                                                                                                                                                         | Si volumen crece: Vercel QStash free tier o `pg-boss` sobre Supabase Postgres (sin Redis).                                                                                                                                    |
| **E2E coverage threshold**      | 4 smokes free; `vitest` sin threshold.                                                                                                                                                                                                                              | Añadir `coverage.threshold` en `vitest.config.ts` cuando haya 30%+ tests; por ahora sin bloquear CI.                                                                                                                          |
| **Analytics / bundle analyzer** | No configurado (evita payload).                                                                                                                                                                                                                                     | `next/bundle-analyzer` dev-only + PostHog free tier opcional (no Mixpanel pago).                                                                                                                                              |
| **Audit logging admin**         | No trail `.`                                                                                                                                                                                                                                                        | Tabla `audit_log` simple (userId, action, target, at) + `prisma.auditLog.create` en `POST /api/admin/*` — sin servicio externo.                                                                                               |
| **PWA / mobile audio QA**       | Serwist + sync-queue ya; no test físico.                                                                                                                                                                                                                            | Lighthouse CI free (GitHub Action) cuando haya runner.                                                                                                                                                                        |

**Regla de oro:** no gastar hasta que `isPremium` tenga al menos 10 usuarios pagos confirmados. Stripe se añade en PR separado con webhook idempotente y tests.

---

## Verificación

```bash
npm run lint && npm run typecheck && npm test && npm run check-i18n
# E2E (requiere dev server o deja que playwright lo arranque):
npx playwright install chromium
npm run test:e2e
# RLS:
psql $DATABASE_URL -f supabase/migrations/001_rls.sql
# Onboarding:
# 1. abrir /dashboard → dialog 3 pasos → Next/Done → cerrar
# 2. reload → no aparece (localStorage onboardingSeen)
# 3. localStorage.removeItem("onboardingSeen") → vuelve a aparecer
# Rate limiting:
# curl -i -X POST http://localhost:3000/api/exercises/<id>/attempt -H "Content-Type: application/json" -d '{"answer":{}}' ×31 → 429 Retry-After
# Cron:
# curl http://localhost:3000/api/challenges/cron → { checkedAt, results: { daily, weekly, timed, streak } }
```

Mantiene Tailwind dark correcto; no rompe `admin/levels/shop/challenges`.
