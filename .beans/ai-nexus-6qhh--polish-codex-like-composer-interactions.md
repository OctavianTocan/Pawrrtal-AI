---
# ai-nexus-6qhh
title: Polish Codex-like composer interactions
status: completed
type: task
priority: normal
created_at: 2026-05-02T22:41:37Z
updated_at: 2026-05-02T22:49:18Z
---

## Goal

Tune the chat composer details to better match the Codex reference: suggestion hover behavior, transparent selector resting states, Auto-review dropdown behavior, and hover tooltips.

## Checklist

- [x] Make suggestions highlight only the text/icon content, not the entire row
- [x] Remove resting background from model selector trigger while preserving hover/open state
- [x] Turn Auto-review into a dropdown with Codex-like permission options
- [x] Add tooltips for composer controls
- [x] Verify typecheck and scoped Biome

## Summary of Changes

Adjusted suggestion rows so hover does not paint the full row, made the model selector transparent at rest, added a real Auto-review dropdown with selected-state/checkmark behavior, and added hover tooltip text to composer controls. Verified with `bun run typecheck` and scoped Biome on the changed composer files.
