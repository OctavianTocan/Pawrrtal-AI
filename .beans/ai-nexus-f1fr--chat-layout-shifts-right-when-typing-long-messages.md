---
# ai-nexus-f1fr
title: Chat layout shifts right when typing long messages
status: completed
type: bug
priority: normal
created_at: 2026-03-10T19:15:54Z
updated_at: 2026-05-02T22:39:08Z
---

## Goal

Fix the chat layout shifting right and the composer collapsing into an unusable strip.

## Completed

- [x] Replaced the percentage-width chat shell with a fixed max-width centered stage.
- [x] Added `min-w-0`, `overflow-hidden`, and stable composer width constraints around the chat surface.
- [x] Exposed `inputGroupClassName` on `PromptInput` so callers can style the real input group surface.
- [x] Removed the extra wrapper inside `ChatComposer` so attachments, textarea, and footer are direct `InputGroup` children.
- [x] Restored a visible, typeable textarea with a Codex-like composer footer.
- [x] Verified with `bun run typecheck` and a scoped Biome check on changed files.

## Summary of Changes

The composer now uses the shared PromptInput layout correctly instead of nesting the textarea/footer inside a wrapper that made InputGroup collapse to its default height. Full `just check` remains blocked by pre-existing unrelated Biome issues outside this slice.
