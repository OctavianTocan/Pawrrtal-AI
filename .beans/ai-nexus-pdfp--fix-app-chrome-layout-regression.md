---
# ai-nexus-pdfp
title: Fix app chrome layout regression
status: completed
type: bug
priority: normal
created_at: 2026-05-02T23:46:58Z
updated_at: 2026-05-02T23:52:15Z
---

## Goal

Repair the app shell layout regression introduced while adding the thin top chrome row.

## Checklist

- [x] Inspect current shell/sidebar sizing code
- [x] Restore stable sidebar and content geometry below the top chrome
- [x] Keep the thin top chrome visible without shifting chat layout
- [x] Verify frontend typecheck and scoped checks

## Summary of Changes

Fixed the app chrome layout regression by restoring explicit full-width and min-width constraints through the shell wrapper, resizable panel group, chat panel, SidebarInset, and chat focus shell. The thin top chrome remains above the resizable sidebar/content area, while the panel group now has the width contract it needs to fill the app surface. Verified with frontend typecheck, scoped Biome, and diff whitespace checks.
