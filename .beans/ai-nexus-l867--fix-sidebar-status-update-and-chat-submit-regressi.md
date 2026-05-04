---
# ai-nexus-l867
title: Fix sidebar status update and chat submit regressions
status: completed
type: bug
priority: normal
created_at: 2026-05-03T13:47:50Z
updated_at: 2026-05-03T13:53:35Z
---

Changing conversation status returns 500 because duplicate PATCH handlers include an old title-only handler; chat stream can return provider command errors; home composer allows a second submit while first-send setup is still pending.

- [x] Remove stale duplicate conversation PATCH/DELETE route handlers
- [x] Prevent double submit during first-message setup and streaming
- [x] Investigate chat provider command error path
- [x] Run focused backend/frontend verification
- [x] Complete this bean with a summary

## Summary of Changes

Removed stale duplicate conversation PATCH/DELETE handlers so metadata-only updates no longer hit the title-only route, added a synchronous chat send guard for the first-message route transition, surfaced stream error events in the chat UI, passed the configured Google API key directly to Agno Gemini models, and wrapped Claude SDK process failures with an actionable stream error. Verified backend compile, route registration, status metadata update, scoped frontend Biome, and Gemini provider streaming.
