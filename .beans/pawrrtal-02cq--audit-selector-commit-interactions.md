---
# pawrrtal-02cq
title: Audit selector commit interactions
status: completed
type: task
priority: high
created_at: 2026-05-15T06:47:13Z
updated_at: 2026-05-15T06:51:18Z
---

Double-check selector/dropdown surfaces for click-only commit paths, align them with the pointer-down commit pattern, and document the convention in AGENTS.md.

- [x] Audit selector/dropdown surfaces.
- [x] Patch selector rows that need pointer-down commit with click fallback.
- [x] Document the convention in AGENTS.md.
- [x] Run scoped checks for touched files.

## Summary of Changes

- Added shared pointer-down commit helpers for app code and the vendored chat composer package.
- Updated selector rows in SelectButton, ModelSelectorPopover, ChatComposerControls, and react-chat-composer selectors/action selector to use pointer-down commit with click fallback.
- Documented the selector commit convention in AGENTS.md.
- Verified no remaining click-only selector rows in the scanned dropdown selector surfaces; targeted selector test, typecheck, and Biome passed.
