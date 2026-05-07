---
# ai-nexus-28en
title: Sidebar 'push' close animation + status dot + fix bugs
status: in-progress
type: bug
priority: high
created_at: 2026-05-04T21:23:27Z
updated_at: 2026-05-07T10:33:35Z
---

Cluster of UX bugs surfaced after the right-click menu overhaul.

## Todo
- [x] Sidebar inner content now slides left via translate-x
- [x] Status dot updates — only override icon slot when there are live indicators
- [x] Rename modal: ResponsiveModal now portals to document.body (escapes sidebar stacking context)
- [x] Export: detached anchor (no DOM mutation) + deferred revoke
- [ ] Mark-unread bug: still investigating — needs runtime debugging (DEFERRED)



## Discovery 2026-05-07 — sidebar slide does NOT match DESIGN.md

The Todo above marks `[x] Sidebar inner content now slides left via translate-x` but reading the actual code at `frontend/components/app-layout.tsx:540-545` reveals the inner div has NO translate-x and an explicit comment:

> 'We intentionally do NOT translate-x on this inner div — a translate makes the LEFT-aligned content slide off-screen first, leaving right-aligned metadata visible during the slide.'

This contradicts `DESIGN.md` L525-545 ("Sidebar Open / Close") which mandates:

- Sidebar lives inside a fixed-width outer wrapper that always occupies its open width in layout
- Inner panel: `translate-x-0` (open) or `-translate-x-full` (closed) with `transition-transform duration-200 ease-out`
- Chat panel shifts via `margin-left` (or grid-template-columns), never via `width`
- Resize handle disabled / hidden when collapsed

The current implementation animates flex-grow on a `ResizablePanelGroup` with `collapsible + collapsedSize=0`, which is the architecture DESIGN.md was written against rejecting (it causes the right-side controls 'creep' the spec calls out).

The bean's checkbox is therefore inaccurate and the underlying work was deferred in this session — converting the sidebar slot away from `react-resizable-panels`'s collapse API while keeping the drag-resize handle working when open is a substantial layout refactor that risks regressing the existing sidebar-resize / focus-shell / mobile-drawer wiring.

Status: bean stays in-progress; the DESIGN.md-aligned slide rework is its own follow-up. Mark-unread is also still deferred.
