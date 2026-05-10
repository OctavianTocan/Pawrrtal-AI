---
# pawrrtal-zz5d
title: Add composer voice recording state
status: completed
type: task
priority: normal
created_at: 2026-05-02T23:00:20Z
updated_at: 2026-05-02T23:14:42Z
---

## Goal

Add Codex-like microphone recording UI state to the chat composer.

## Checklist

- [x] Add normal and hover microphone button styling
- [x] Add active voice meter state after clicking microphone
- [x] Add stop action that transcribes into the draft
- [x] Add send action that transcribes and submits
- [x] Match send button style to Codex circular arrow
- [x] Verify typecheck and scoped Biome

## Summary of Changes

Added Codex-like microphone controls to the chat composer: normal hover styling, an active recording meter with elapsed time, stop-to-transcribe behavior, transcribe-and-send behavior, and the circular arrow send button treatment for typed and voice sends. Verified with frontend typecheck, scoped Biome, and diff whitespace checks.
