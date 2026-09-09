# Lesson images

- Level heroes: `level-a1.png` → `level-c2.png` (pollinations/flux, 1024×576) — thematic per CEFR: A1 greetings, A2 daily life, B1 travel, B2 work, C1 academic, C2 business.
- Teaching placeholder: `teaching-placeholder.png` — fallback for `TeachingContent` when no blocks/cover.
- Fallback chain: local `/lesson-images/*` → `https://picsum.photos/seed/...` (seed.ts). Remote patterns in `next.config.ts` allow picsum/unsplash/supabase.
- Generated via `pollinations_generateImage` (flux, enhance:true). Re-generate with `npm run` or manual pollinations call if needed.
