---
# ai-nexus-5xtg
title: 'Sidebar slide animation: implementation matches DESIGN.md spec'
status: todo
type: feature
priority: normal
created_at: 2026-05-07T09:31:18Z
updated_at: 2026-05-07T09:31:18Z
---

Currently the sidebar uses ResizablePanel.collapse() to shrink width from ~320 px to 0; the chat inset's flex-grow simultaneously transitions to fill the freed space. This violates DESIGN.md's Motion section (lines 492-510) which mandates:

> The sidebar opens and closes by translating the panel along the X axis at its full open width — not by interpolating its width from 0 to 288px. Animating width forces the content area's text and controls to reflow on every frame, which manifests as right-side controls 'creeping' toward the conversation titles during the animation.

> Implementation contract:
> - The sidebar lives inside a fixed-width outer wrapper that always occupies its open width in the layout.
> - The inner panel has translate-x-0 when open and -translate-x-full when closed, with transition-transform duration-200 ease-out.
> - The main content area listens to the same open/closed state and shifts via margin-left (or grid-template-columns), in sync with the panel transform — never via width.
> - The resize handle is disabled / hidden while the panel is closed; the user can't grab a panel they can't see.

## Implementation

Replace the ResizablePanel collapse pattern in `frontend/components/app-layout.tsx:479-607` with:

- Sidebar wrapper: fixed width = persisted user width (default 320 px). Position: relative.
- Sidebar inner: `translate-x-0` (open) or `-translate-x-full` (closed). `transition-transform duration-140 ease-out`.
- Chat inset: `margin-left: var(--sidebar-width)` (open) or `margin-left: 0` (closed). Transitions in sync.
- Resize handle: hidden when closed (absolutely positioned at right edge of sidebar wrapper).
- localStorage width persistence: keep the existing key.
- Drag-to-resize: still works while open. Disabled while closed.

## Caveats

- Mobile responsive: probably already drawer-overlay; verify it stays correct.
- Scrollbar gutter: chat panel might shift slightly when sidebar appears/disappears if scrollbar gutter isn't reserved. Use `scrollbar-gutter: stable` if needed.

## Tasks

- [ ] Refactor app-layout.tsx — remove ResizablePanel for sidebar, replace with translateX
- [ ] Wire localStorage width to a CSS variable on the sidebar wrapper
- [ ] Update chat inset to react to `isSidebarCollapsed` via margin-left
- [ ] Disable resize handle while collapsed
- [ ] Verify mobile drawer behavior unaffected
- [ ] Test drag-to-resize still works on desktop
- [ ] Verify the 'controls creeping' visual bug is gone
