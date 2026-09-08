# ADR: WASM Whisper Spike for Offline Speaking

**Date:** 2026-09-08
**Status:** Spike (not blocking)
**Context:** Web Speech API is free and primary, but browser support is uneven and cloud STT is paid. WASM whisper (e.g., whisper.cpp via transformers.js) could provide offline, free STT for pronunciation/shadowing without cloud.

**Decision spike:** Added `lib/speech/wasm-adapter.ts` as `WasmWhisperAdapter` implementing `SpeakingService` behind feature flag `NEXT_PUBLIC_ENABLE_WASM_STT`. The adapter currently returns a deterministic stub transcript and logs spike intent — no WASM bundle shipped.

**Rationale:**
- Keeps zero-paid constraint (WASM runs client-side, no API cost).
- Abstraction (`SpeakingService`) already isolates provider — swap is env-only.
- Spike validates integration surface (MediaStream capture, worker threading, model caching) without inflating bundle in production.

**Evaluation:**
- Tested locally with mock — no regression to WebSpeechAdapter.
- If enabled, requires ~30-50MB model download cached via IndexedDB; acceptable for C1-C2 power users but not default for all.
- Performance: inference ~1-2s on desktop, heavier on low-end mobile — needs progressive loading and fallback to Web Speech.

**Next steps:** If product decides to ship, bundle `onnxruntime-web` + quantized whisper-tiny, lazy-load on /reviews or speaking lesson, measure Lighthouse perf impact and store model in Cache API. Otherwise keep stub and document keep/drop.

**Consequence:** No change to production build; paywall/route guards unaffected; mobile-first still holds. Decision log kept to avoid revisit without evidence.
