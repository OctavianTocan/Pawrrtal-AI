---
# pawrrtal-os7m
title: Fix message send duplicate conversation and chat route failures
status: completed
type: bug
priority: normal
created_at: 2026-05-03T13:44:18Z
updated_at: 2026-05-03T13:46:48Z
---

Sending a first message can leave the UI thinking forever because conversation creation retries insert the same client-generated UUID and the chat stream posts to /api/chat while the backend exposes /api/v1/chat/.

- [x] Confirm frontend/backend message send route mismatch
- [x] Make conversation creation idempotent for existing owned client-generated IDs
- [x] Align frontend chat endpoint with backend route
- [x] Run focused frontend and backend verification
- [x] Complete this bean with a summary

## Summary of Changes

Made client-generated conversation creation idempotent for the same owning user, converted cross-user UUID collisions into 409 responses, and changed the chat stream hook to use the shared /api/v1/chat endpoint constant instead of the stale /api/chat path. Verified backend compile, frontend typecheck, scoped Biome, and a live duplicate-create service check.
