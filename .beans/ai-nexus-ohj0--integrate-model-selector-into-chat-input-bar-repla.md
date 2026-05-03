---
# ai-nexus-ohj0
title: Integrate model selector into chat input bar (replace dialog-based selector)
status: completed
type: task
priority: high
created_at: 2026-03-12T00:41:58Z
updated_at: 2026-05-02T22:32:09Z
parent: ai-nexus-3i2d
blocked_by:
    - ai-nexus-6k3a
---

## Goal

Integrate the custom Codex-style model selector into the chat input bar and remove the old dialog-based selector from ChatView.

## Completed

- [x] Removed the ai-elements dialog ModelSelector imports and usage from `ChatView.tsx`.
- [x] Rendered `ModelSelectorPopover` inside the new `ChatComposer` input island.
- [x] Positioned the trigger as a compact pill in the composer footer next to voice and send controls.
- [x] Wired selected model and reasoning state through `ChatContainer` and `ChatView`.
- [x] Used local visual-first model options for Google and OpenAI-style labels.
- [x] Opened the selector upward from the bottom composer.
- [x] Verified the changed chat files with scoped Biome and `bun run typecheck`.

## Summary of Changes

Replaced the old dialog selector with a compact dropdown model/reasoning selector, moved composer UI into feature components, and now sends the selected `model_id` with chat requests. Full `just check` remains blocked by pre-existing unrelated Biome issues outside this slice.
