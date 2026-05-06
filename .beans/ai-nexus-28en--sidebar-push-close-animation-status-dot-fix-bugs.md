---
# ai-nexus-28en
title: Sidebar 'push' close animation + status dot + fix bugs
status: in-progress
type: bug
priority: high
created_at: 2026-05-04T21:23:27Z
updated_at: 2026-05-04T21:37:56Z
---

Cluster of UX bugs surfaced after the right-click menu overhaul.

## Todo
- [x] Sidebar inner content now slides left via translate-x
- [x] Status dot updates — only override icon slot when there are live indicators
- [x] Rename modal: ResponsiveModal now portals to document.body (escapes sidebar stacking context)
- [x] Export: detached anchor (no DOM mutation) + deferred revoke
- [ ] Mark-unread bug: still investigating — needs runtime debugging (DEFERRED)
