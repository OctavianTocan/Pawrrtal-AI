---
# ai-nexus-0sq5
title: Reserve thin top app chrome
status: completed
type: task
priority: normal
created_at: 2026-05-02T23:16:51Z
updated_at: 2026-05-02T23:21:18Z
---

## Goal

Create a thin app-style horizontal top strip for workspace, docs/help, add, and side-panel controls.

## Checklist

- [x] Move top controls into a thinner app chrome row
- [x] Keep sidebar and chat content aligned below the chrome
- [x] Preserve workspace/help dropdown affordances
- [x] Verify typecheck and scoped Biome

## Summary of Changes

Added a thin app-wide top chrome row above the resizable sidebar and chat panels. Moved the sidebar toggle, workspace selector, add action, and help menu into that strip, and changed the chat view to fill the remaining panel height below it. Verified with frontend typecheck, scoped Biome, and diff whitespace checks.
