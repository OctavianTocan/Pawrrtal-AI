# Craft Agents UI Reskin v2 — Proper Source Forks

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simplified component rewrites from v1 with actual forks of Craft's source files.

**Architecture:** Copy Craft source files verbatim, then make ONLY the minimum changes needed to compile in our Next.js app. No simplifying, no rewriting, no "capturing the essence."

**Tech Stack:** Same as v1 (React 19, Next.js 16, Jotai, TanStack Query, Motion v12, Tailwind v4)

**What's already done (from PR #27):**
- Chunk 0: Jotai, electron shim, atoms, craft-ui vendored — CORRECT, keep
- Chunk 1: globals.css theme — CORRECT, keep
- Chunks 2-6: Components — WRONG (rewrites, not forks). This plan redoes them.

**Source files at:** `.craft-source/apps/electron/src/renderer/`

---

## CRITICAL INSTRUCTION FOR ALL SUBAGENTS

**You are COPYING source files and making minimal edits. You are NOT writing new code.**

For every component task:
1. The source file content will be provided in the prompt
2. Copy it VERBATIM to the target path
3. Make ONLY the listed import/wiring changes
4. The output file MUST be 80%+ identical in structure and line count to the source
5. Do NOT simplify, clean up, remove features, or rewrite any part of the source
6. If the source file is 500 lines, your output must be 400+ lines. If it's significantly shorter, you've rewritten — stop and start over.

---

## Chunk 2v2: App Shell & Top Bar (redo)

### What to delete first

Delete all files in `frontend/components/shell/` — these are the v1 rewrites being replaced.

### Files to fork

| Source | Target | Lines |
|--------|--------|-------|
| `.craft-source/.../app-shell/AppShell.tsx` | `frontend/components/shell/AppShell.tsx` | ~1000+ |
| `.craft-source/.../app-shell/Panel.tsx` | `frontend/components/shell/Panel.tsx` | ~63 |
| `.craft-source/.../app-shell/PanelHeader.tsx` | `frontend/components/shell/PanelHeader.tsx` | ~184 |
| `.craft-source/.../app-shell/TopBar.tsx` | `frontend/components/shell/TopBar.tsx` | ~468 |
| `.craft-source/.../app-shell/LeftSidebar.tsx` | `frontend/components/shell/LeftSidebar.tsx` | ~591 |
| `.craft-source/.../app-shell/MainContentPanel.tsx` | `frontend/components/shell/MainContentPanel.tsx` | ~100+ |

### Import changes to make (ONLY these)

For each file, make ONLY these substitutions:
- `@craft-agent/ui` → `@/components/craft-ui/...` (match the actual export path)
- `@craft-agent/shared` → inline the type or create a local type file
- `@craft-agent/core` → inline the type or stub
- `@/atoms/...` → `@/atoms/...` (should match if Craft uses same path convention; adjust if not)
- `@/hooks/...` → copy the hook from `.craft-source/.../hooks/` to `frontend/hooks/`
- `@/lib/...` → copy the util from `.craft-source/.../lib/` to `frontend/lib/`
- `@/components/ui/...` → `@/components/craft-ui/components/ui/...` or copy to our ui/
- `@/contexts/...` → copy from `.craft-source/.../contexts/`
- `@/actions/...` → copy from `.craft-source/.../actions/`
- `@/config/...` → copy from `.craft-source/.../config/`
- `window.electronAPI` direct calls → import from `@/lib/electron-shim`

### Dependency chain approach

When a forked file imports something we don't have, the correct action is:
1. Copy that dependency from the Craft source too
2. NOT stub it, NOT simplify it, NOT remove the import
3. Follow the chain until we reach either: a node_module (install it), our atoms, or the electron shim

Wire into Next.js layout after all shell files compile.

## Chunk 3v2: Sidebar Session List (redo)

### What to delete first

Delete `frontend/components/shell/SessionList.tsx`, `SessionItem.tsx`, `SessionSearchHeader.tsx` (v1 rewrites).

### Files to fork

| Source | Target |
|--------|--------|
| `.craft-source/.../app-shell/SessionList.tsx` | `frontend/components/shell/SessionList.tsx` |
| `.craft-source/.../app-shell/SessionItem.tsx` | `frontend/components/shell/SessionItem.tsx` |
| `.craft-source/.../app-shell/SessionSearchHeader.tsx` | `frontend/components/shell/SessionSearchHeader.tsx` |
| `.craft-source/.../app-shell/SessionBadges.tsx` | `frontend/components/shell/SessionBadges.tsx` |
| `.craft-source/.../app-shell/SessionStatusIcon.tsx` | `frontend/components/shell/SessionStatusIcon.tsx` |
| `.craft-source/.../app-shell/SessionMenu.tsx` | `frontend/components/shell/SessionMenu.tsx` |

Plus all hooks/utils they import (copy the full dependency chain).

### Data wiring

The session data atom needs to provide data in Craft's expected shape. Our `craftSessionsAtom` adapter handles this — verify it maps all fields SessionItem needs.

## Chunk 4v2: Chat Messages + Empty State + Loading (redo)

### What to delete first

Delete all files in `frontend/components/chat/` (v1 rewrites).

### Files to fork

| Source | Target |
|--------|--------|
| `.craft-source/.../app-shell/ChatDisplay.tsx` | `frontend/components/chat/ChatDisplay.tsx` |
| `.craft-source/.../chat/EmptyStateHint.tsx` | `frontend/components/chat/EmptyStateHint.tsx` |
| `.craft-source/packages/ui/src/components/chat/TurnCard.tsx` | `frontend/components/chat/TurnCard.tsx` |
| `.craft-source/packages/ui/src/components/chat/turn-utils.ts` | `frontend/components/chat/turn-utils.ts` |

Plus their streaming markdown, overlay, and activity components — follow the dependency chain.

### Data wiring

ChatDisplay reads messages from Craft's session atoms. Wire to our `messagesAtom` / `isStreamingAtom`. ChatContainer stays as the bridge between our API and the atoms.

## Chunk 5v2: Input Area & Model Selector (redo)

### What to delete first

Delete `frontend/components/input/ChatInput.tsx` (v1 rewrite).

### Files to fork

| Source | Target |
|--------|--------|
| `.craft-source/.../app-shell/input/FreeFormInput.tsx` | `frontend/components/input/FreeFormInput.tsx` |
| `.craft-source/.../app-shell/input/InputContainer.tsx` | `frontend/components/input/InputContainer.tsx` |
| `.craft-source/.../app-shell/input/ChatInputZone.tsx` | `frontend/components/input/ChatInputZone.tsx` |
| `.craft-source/.../app-shell/input/ToolbarStatusSlot.tsx` | `frontend/components/input/ToolbarStatusSlot.tsx` |
| `.craft-source/.../app-shell/input/useAutoGrow.ts` | `frontend/components/input/useAutoGrow.ts` |
| `.craft-source/.../components/ui/rich-text-input.tsx` | `frontend/components/ui/rich-text-input.tsx` |

FreeFormInput is ~97KB (their largest file). Copy it ALL. Follow the full dependency chain.

## Chunk 6v2: UI Primitives & Polish (redo)

### Files to fork

For each shadcn/ui component in `.craft-source/.../components/ui/`, compare with ours. If Craft's version exists, replace ours:

Priority files: `button.tsx`, `badge.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `context-menu.tsx`, `popover.tsx`, `select.tsx`, `tabs.tsx`, `separator.tsx`, `scroll-area.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `switch.tsx`, `drawer.tsx`

Plus Craft-specific components we need: `entity-row.tsx`, `entity-list.tsx`, `entity-icon.tsx`, `entity-panel.tsx`, `mention-badge.tsx`, `metadata-badge.tsx`, `source-avatar.tsx`, `skill-avatar.tsx`, `status-icon.tsx`, `kbd.tsx`

### Auth pages

Restyle login/signup to use the new component set.

### Cleanup

Delete all unused files from old implementation.

---

## Key difference from v1

| v1 (failed) | v2 (this plan) |
|-------------|----------------|
| "Fork Craft's components" | "Copy this exact file, make ONLY these changes" |
| Subagents interpreted and rewrote | Subagents paste source content and edit minimally |
| 70-80% of code missing | Must be 80%+ identical to source |
| Simplified approximations | Full-featured forks with dependency chains |
| Missing: DnD, context menus, keyboard nav, annotations, overlays | All features preserved from source |
