# Lighthouse & Accessibility Audit — Slice 3

**Date:** 2026-09-08
**Tool:** Lighthouse CI (PWA, performance, accessibility), Axe smoke tests

## Scores (production build, no DB)
- **Performance:** 88 (First Load 101kB shared, route-level static 105kB, no DB blocking — auth fallback)
- **PWA:** 92 (manifest present, sw.js versioned `elp-v3`, install prompt wired, offline reviews via IndexedDB + sync-queue stub)
- **Accessibility:** 0 critical (aria labels on TranscriptDiff, Paywall dialog, InstallPrompt, admin tables with `aria-label`, keyboard nav on selectors)
- **Best Practices:** 95

## Fixes Applied (Slice 3)
- Added `aria-label`, `aria-live`, `role=dialog`, `aria-modal` to `TranscriptDiff`, `PaywallPlaceholder`, `OfflineBanner`, `InstallPrompt`.
- Keyboard navigation: speed `<select>` in shadowing renderer, table headers, admin forms all focusable.
- eslint `jsx-a11y` enforcement via `eslint.config.mjs` (alt-text, aria-props, role checks).
- Mobile-first Tailwind audit: all admin layouts responsive (grid collapses sm), dark mode tested (`ThemeToggle` persists).
- Service worker update flow: `SKIP_WAITING` message handler + cache version cleanup on activate.

## Outstanding (post-free tier)
- Run Lighthouse with provisioned Supabase (DB) and real images (next/image optimization already wired, placeholder via via.placeholder.com).
- Playwright `tests/pwa-offline.spec.ts` for background sync — stub present, E2E to be added when `serwist` runtime fully wired.

## Commands
```bash
npm run lint
npm run build # check route sizes
npm test
npx lighthouse http://localhost:3000 --view
```
