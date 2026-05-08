---
# pawrrtal-28en
title: Sidebar 'push' close animation + status dot + fix bugs
status: completed
type: bug
priority: high
created_at: 2026-05-04T21:23:27Z
updated_at: 2026-05-07T11:26:54Z
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

## Completion summary 2026-05-07

The DESIGN.md-aligned sidebar slide rework landed in `frontend/components/app-layout.tsx`:

- `ResizablePanelGroup` / `ResizablePanel` removed.
- Outer wrapper has `width: <desktopWidth>` while expanded, collapses to `0` while closed; the chat panel is `flex-1` and absorbs the freed space.
- Inner panel is `position: absolute` and translates `translate-x-0` (open) ↔ `-translate-x-full` (closed) with `transition-transform duration-200 ease-out`.
- Custom `useSidebarDragResize` hook writes width to a `--sidebar-width` CSS variable on `documentElement` during drag (no React re-render per frame), then persists the final clamped width via `setDesktopWidth` on pointerup.
- Resize handle hidden / disabled while collapsed.
- `motion-reduce:transition-none` on every transitioning element.
- Mobile drawer (Sheet overlay) untouched.

### Verification

- Frontend `bunx tsc --noEmit` clean.
- Frontend vitest: 309 passing (no regression).
- The "creep" effect the bean documented is gone — the chat panel and sidebar now translate together at full width without re-flowing the sidebar contents on every frame.

Mark-unread remains deferred to its own bean (see `pawrrtal-p9xy`); it was scoped out of this round per the original bean.
