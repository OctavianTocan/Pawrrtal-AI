# Craft-style Resizable Three-Panel Shell Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `pawrrtal`’s current desktop two-pane sidebar/chat layout with a Craft-style three-panel shell: `LeftSidebar` (fixed px, resizable), `SessionList` (fixed px, resizable), and `MainContent` (fills remaining width), while preserving a compact/mobile experience.

**Architecture:** Do **not** blindly port Craft’s entire multi-content panel stack. `pawrrtal` only needs the **left-rail portion** of Craft right now: two persisted pixel widths, two absolute drag sashes, a compact-mode width observer, and a main content panel that flexes into the remaining space. Introduce Jotai for layout state and persistence, extract the shell into focused layout components, and adapt current `NavChats`/`ChatContainer` pages so they fill the new shell cleanly.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Jotai (new dependency), existing `motion` dependency only if animated width transitions are wanted, existing `SidebarFocusProvider` for keyboard zone navigation.

---

## Current State Analysis

### What exists today

- `frontend/components/app-layout.tsx`
  - Desktop layout is a **two-pane** `ResizablePanelGroup`:
    - left: current `Sidebar` containing `NewSessionButton` + `NavChats`
    - right: `children` (chat/dashboard content)
  - Mobile uses the current `Sidebar` sheet overlay.
- `frontend/components/ui/sidebar.tsx`
  - Owns desktop sidebar width/state (`desktopWidth`, `state`) and mobile open state.
  - Is tightly coupled to the old “one sidebar + one content area” layout.
- `frontend/features/nav-chats/NavChats.tsx`
  - Already behaves like a **session/navigator panel**, not a global app sidebar.
  - Registers as focus zone `navigator`.
- `frontend/features/nav-chats/sidebar-focus.tsx`
  - Already has the exact three focus zones we need conceptually: `sidebar`, `navigator`, `chat`.
- `frontend/app/(app)/page.tsx` and `frontend/app/(app)/c/[conversationId]/page.tsx`
  - Wrap chat pages in extra `<div>` elements; the conversation route also renders an unnecessary `<h1>`.
- `frontend/features/chat/ChatView.tsx`
  - Assumes a viewport-driven layout (`h-[90vh]`) instead of filling a parent shell panel.
- `frontend/app/(app)/dashboard/page.tsx`
  - Still mounts its **own** `SidebarProvider` / `AppSidebar`, which will conflict with the new shared shell.

### What Craft does that matters here

From `docs/craft-resizable-panels.md`, the useful parts for `pawrrtal` are:

1. **Two left rails are pixel-sized and independently resizable**
   - `sidebarWidth`: clamped and persisted
   - `sessionListWidth`: clamped and persisted
2. **Desktop shell is `flex` + absolute sash geometry**, not `react-resizable-panels`
3. **Compact mode is derived from container width** (`ResizeObserver`)
4. **Only the main content strip uses proportional panel math** in Craft
   - `pawrrtal` does **not** need Craft’s `panelStackAtom` / `PanelResizeSash` for multiple content panes yet
   - For `pawrrtal` today, `MainContent` can just be `flex: 1 1 auto`

### Direct mapping from Craft to `pawrrtal`

| Craft concept | `pawrrtal` equivalent | Port now? | Notes |
|---|---|---:|---|
| `sidebarWidth` | `LeftSidebar` width | Yes | New desktop-only px width state |
| `sessionListWidth` | `NavChats` container width | Yes | Move `NewSessionButton` + `NavChats` into dedicated session panel |
| `useContainerWidth` | shell compact-mode observer | Yes | Needed to auto-collapse to mobile/compact |
| absolute left rail sashes | `LeftSidebar` / `SessionList` drag handles | Yes | This is the real desktop resize behavior to copy |
| `panelStackAtom` | multi-chat/content tabs | No (not yet) | Overkill until `pawrrtal` can open multiple main panels |
| `PanelResizeSash` between content panels | future main-content multi-panel split | No (not yet) | Mention as future extension only |
| `flexGrow: proportion` content widths | `MainContent` | No (not yet) | Single main panel only |

---

## File Structure / Ownership

### Create

- `frontend/store/layout-atoms.ts`
  - Jotai atoms for desktop layout preferences and shell UI state.
  - Persist `leftSidebarWidth`, `sessionListWidth`, `leftSidebarVisible`, and optional compact override state.
- `frontend/components/layout/layout-constants.ts`
  - Centralize Craft-derived geometry constants (`PANEL_GAP`, hit widths, edge inset, min/max widths).
- `frontend/components/layout/use-container-width.ts`
  - `ResizeObserver` hook for shell width and compact mode.
- `frontend/components/layout/use-resize-gradient.ts`
  - Shared hover/drag gradient visuals for sashes.
- `frontend/components/layout/resizable-sash.tsx`
  - Generic visual sash used for the two desktop drag seams.
- `frontend/components/layout/left-sidebar-panel.tsx`
  - Global app navigation / collapse control / future workspace or user chrome.
- `frontend/components/layout/session-list-panel.tsx`
  - Header + `NewSessionButton` + `NavChats`; this is Craft’s navigator equivalent.
- `frontend/components/layout/desktop-three-panel-shell.tsx`
  - Desktop-only flex shell with two resizable left rails and `children` as main content.
- `frontend/components/layout/mobile-shell.tsx`
  - Compact/mobile fallback that reuses existing sheet behavior or a simplified overlay.
- `frontend/components/layout/main-content-shell.tsx`
  - Optional wrapper for the right panel surface (`h-full`, shadows, rounded edges, header slot if needed).

### Modify

- `frontend/package.json`
  - Add `jotai`.
- `frontend/app/providers.tsx`
  - Add `<Provider>` from Jotai around the app.
- `frontend/components/app-layout.tsx`
  - Replace current `ResizablePanelGroup` implementation with a shell orchestrator that chooses desktop vs compact/mobile.
- `frontend/components/ui/sidebar.tsx`
  - Reduce responsibilities or stop using its desktop width logic from `AppLayout`.
  - Keep only what still matters for mobile sheet behavior if reused.
- `frontend/components/new-session-button.tsx`
  - Stop coupling to the old sidebar desktop behavior; only close compact/mobile sheet if present.
- `frontend/features/nav-chats/sidebar-focus.tsx`
  - Keep zone model, but verify `sidebar -> navigator -> chat` order still works with the new physical layout.
- `frontend/features/nav-chats/NavChats.tsx`
  - Keep `navigator` zone registration; may only need container/focus cleanup.
- `frontend/features/nav-chats/NavChatsView.tsx`
  - Ensure it fills the new session panel (`min-h-0`, overflow behavior, no hidden height assumptions).
- `frontend/features/chat/ChatView.tsx`
  - Remove viewport height hacks and make it fill the main panel.
- `frontend/app/(app)/page.tsx`
  - Return a height-filling chat surface without extra wrappers.
- `frontend/app/(app)/c/[conversationId]/page.tsx`
  - Remove the extra `<h1>` / wrapper so the conversation view fills the panel.
- `frontend/app/(app)/dashboard/page.tsx`
  - Remove nested sidebar shell so dashboard renders inside the global three-panel layout.
- `frontend/components/app-sidebar.tsx`
  - Delete or deprecate once `SessionListPanel` replaces it.

---

## Target Layout Contract

### Desktop

```text
[ LeftSidebar width:px ] [ SessionList width:px ] [ MainContent flex:1 ]
```

- Outer shell: `display: flex; position: relative; height: 100%`
- Left sidebar width: persisted px, clamped
- Session list width: persisted px, clamped
- Main content: `flex: 1 1 auto; min-width: 0`
- Two absolute drag handles rendered on top of the seams

### Compact/mobile

Mimic Craft’s compact behavior without porting the content panel stack:

- If shell width `< MOBILE_THRESHOLD` (start with `768` to match Craft), hide the desktop three-panel shell.
- Show either:
  - a mobile sheet/drawer for navigation, and
  - main content full-width
- The current `Sidebar` mobile sheet is good enough as the first compact implementation.

### Width clamps to start with

Use Craft’s same starting clamps unless the product calls for different numbers:

- `LEFT_SIDEBAR_MIN_WIDTH = 180`
- `LEFT_SIDEBAR_MAX_WIDTH = 320`
- `SESSION_LIST_MIN_WIDTH = 240`
- `SESSION_LIST_MAX_WIDTH = 480`
- `MOBILE_THRESHOLD = 768`

If product wants a narrower icon rail later, change only the left sidebar constants and component content — not the resize architecture.

---

## State Design

## Chunk 1: Layout state and shell geometry

### Task 1: Add Jotai-based layout state

**Files:**
- Create: `frontend/store/layout-atoms.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/app/providers.tsx`

- [ ] **Step 1: Add Jotai dependency**

Run: `bun --cwd frontend add jotai`
Expected: `frontend/package.json` gains `jotai`

- [ ] **Step 2: Create layout atoms**

Define atoms for:

- `leftSidebarVisibleAtom` → boolean, default `true`
- `leftSidebarWidthAtom` → number, default `220`
- `sessionListWidthAtom` → number, default `300`
- `isDesktopChromeHiddenAtom` (optional) → boolean, default `false`

Use either `atomWithStorage` from `jotai/utils` or a tiny custom persistence wrapper. If using `atomWithStorage`, keep the storage keys explicit:

- `layout.leftSidebarVisible`
- `layout.leftSidebarWidth`
- `layout.sessionListWidth`

- [ ] **Step 3: Add width clamp helpers in the same module or constants module**

Include exact helpers:

- `clampLeftSidebarWidth(width)`
- `clampSessionListWidth(width)`

These must be used by all drag code and hydration code so persisted garbage cannot break the shell.

- [ ] **Step 4: Add Jotai provider**

Wrap `Providers` output with Jotai’s root provider so layout atoms are available in `AppLayout` and child panels.

- [ ] **Step 5: Validate dependency + types**

Run: `bun --cwd frontend typecheck`
Expected: PASS

### Task 2: Add Craft-style geometry primitives

**Files:**
- Create: `frontend/components/layout/layout-constants.ts`
- Create: `frontend/components/layout/use-container-width.ts`
- Create: `frontend/components/layout/use-resize-gradient.ts`
- Create: `frontend/components/layout/resizable-sash.tsx`

- [ ] **Step 1: Create layout constants**

Add a focused constants file with:

- `PANEL_GAP = 6`
- `PANEL_EDGE_INSET = 6`
- `PANEL_SASH_HIT_WIDTH = 8`
- `PANEL_SASH_LINE_WIDTH = 2`
- `PANEL_SASH_HALF_HIT_WIDTH = PANEL_SASH_HIT_WIDTH / 2`
- `PANEL_STACK_VERTICAL_OVERFLOW = 8`
- width min/max constants listed above
- `MOBILE_THRESHOLD = 768`

- [ ] **Step 2: Create `useContainerWidth`**

Port the tiny `ResizeObserver` hook from Craft almost verbatim. This is the right tool here; do not poll `window.innerWidth`.

- [ ] **Step 3: Create `useResizeGradient` + shared gradient math**

Use Craft’s hover/drag Y-tracking pattern so both left rail sashes feel alive and consistent.

- [ ] **Step 4: Create `ResizableSash`**

This component should only handle:

- hit area rendering
- gradient visuals
- mouse down callback
- optional `left` style positioning from parent
- optional `onDoubleClick` for future reset behavior

It should **not** own width state. The shell owns geometry and drag math.

- [ ] **Step 5: Validate**

Run: `bun --cwd frontend typecheck`
Expected: PASS

---

## Chunk 2: Replace the desktop shell

### Task 3: Build the new desktop three-panel shell

**Files:**
- Create: `frontend/components/layout/desktop-three-panel-shell.tsx`
- Create: `frontend/components/layout/left-sidebar-panel.tsx`
- Create: `frontend/components/layout/session-list-panel.tsx`
- Create: `frontend/components/layout/main-content-shell.tsx`
- Modify: `frontend/components/app-layout.tsx`

- [ ] **Step 1: Extract the left sidebar panel**

Create `left-sidebar-panel.tsx` for the **global** sidebar, not the session list.

Initial contents should be minimal but structurally correct:

- collapse/expand button
- app-level nav links (e.g. `Chats`, `Dashboard`)
- optional footer/user area placeholder

Important: this panel is the target for focus zone `sidebar`.

- [ ] **Step 2: Extract the session list panel**

Create `session-list-panel.tsx` that contains:

- `NewSessionButton` in header
- `NavChats` in body
- shell classes like `h-full flex min-h-0 flex-col`

This becomes Craft’s `navigatorSlot` equivalent.

- [ ] **Step 3: Create main content shell wrapper**

Create a thin wrapper that gives `children`:

- `h-full`
- `min-w-0`
- `min-h-0`
- panel surface/shadow/radius classes if wanted

The right panel should own overflow behavior cleanly so route pages do not have to guess at height.

- [ ] **Step 4: Implement desktop shell flex layout**

In `desktop-three-panel-shell.tsx`, render:

```tsx
<div ref={shellRef} className="relative flex h-full items-stretch" style={{ gap: PANEL_GAP, paddingRight: PANEL_EDGE_INSET, paddingBottom: PANEL_EDGE_INSET }}>
  <div style={{ width: leftSidebarVisible ? leftSidebarWidth : 0 }} />
  <div style={{ width: sessionListWidth }} />
  <div className="min-w-0 flex-1">...</div>

  <ResizableSash ... />
  <ResizableSash ... />
</div>
```

Use real panel content, not placeholders.

- [ ] **Step 5: Implement drag math for the left sidebar seam**

Mirror Craft’s document-level listeners:

- on mouse down, store active handle = `'left-sidebar'`
- on `mousemove`, compute:

```ts
const newWidth = clampLeftSidebarWidth(e.clientX)
```

or, if shell-relative coordinates are cleaner:

```ts
const newWidth = clampLeftSidebarWidth(e.clientX - shellRect.left)
```

Pick one coordinate system and use it consistently. Shell-relative math is safer if the app is not flush with the viewport.

Persist width on mouse up.

- [ ] **Step 6: Implement drag math for the session list seam**

Mirror Craft’s offset logic:

```ts
const leftOffset = leftSidebarVisible ? leftSidebarWidth + PANEL_GAP : PANEL_EDGE_INSET
const newWidth = clampSessionListWidth(e.clientX - shellRect.left - leftOffset)
```

This is the crucial mapping from Craft’s `e.clientX - offset` math into `pawrrtal`’s shell.

- [ ] **Step 7: Position the absolute sashes exactly from state**

Use `left` positions derived from current widths:

Left sidebar sash:

```ts
leftSidebarVisible
  ? leftSidebarWidth + PANEL_GAP / 2 - PANEL_SASH_HALF_HIT_WIDTH
  : -PANEL_GAP
```

Session list sash:

```ts
(leftSidebarVisible ? leftSidebarWidth + PANEL_GAP : PANEL_EDGE_INSET)
+ sessionListWidth
+ PANEL_GAP / 2
- PANEL_SASH_HALF_HIT_WIDTH
```

If the shell uses different padding than Craft, adjust both formulas together.

- [ ] **Step 8: Replace the old `ResizablePanelGroup` in `app-layout.tsx`**

`AppLayout` should become an orchestrator:

- desktop → `DesktopThreePanelShell`
- compact/mobile → `MobileShell`

Delete the old `ResizablePanel`, `ResizableHandle`, `ResizablePanelGroup`, and `usePanelRef` usage from `app-layout.tsx`.

- [ ] **Step 9: Validate**

Run:
- `bun --cwd frontend typecheck`
- `bun --cwd frontend build`

Expected: PASS

### Task 4: Decide what survives from `components/ui/sidebar.tsx`

**Files:**
- Modify: `frontend/components/ui/sidebar.tsx`
- Modify: `frontend/components/app-layout.tsx`
- Modify: `frontend/components/new-session-button.tsx`

- [ ] **Step 1: Stop using `Sidebar` desktop width logic from `AppLayout`**

The old sidebar component is coupled to one desktop sidebar gap and fixed container positioning. That machinery will fight the new three-panel shell.

- [ ] **Step 2: Keep only mobile behavior you still need**

Recommended path:

- keep `SidebarProvider` if you still want:
  - mobile sheet open state
  - `⌘/Ctrl + b` toggle shortcut
- stop reading `desktopWidth` / desktop `state` from it in the new shell

- [ ] **Step 3: Update `NewSessionButton`**

It currently imports `useSidebar()` only to close the mobile sheet.

Keep that behavior, but make sure the button does **not** assume the old desktop sidebar still exists.

- [ ] **Step 4: Validate**

Run: `bun --cwd frontend typecheck`
Expected: PASS

---

## Chunk 3: Compact mode and route cleanup

### Task 5: Add compact/mobile shell switching

**Files:**
- Create: `frontend/components/layout/mobile-shell.tsx`
- Modify: `frontend/components/app-layout.tsx`

- [ ] **Step 1: Measure shell width with `useContainerWidth`**

Use a ref on the shell container in `AppLayout` or `DesktopThreePanelShell` and compute:

```ts
const isAutoCompact = shellWidth > 0 && shellWidth < MOBILE_THRESHOLD
```

- [ ] **Step 2: Choose compact behavior**

Recommended first implementation for `pawrrtal`:

- compact/mobile: no persistent desktop three-panel shell
- show `children` full-width
- expose `SessionListPanel` through the current mobile sheet/drawer
- optionally hide `LeftSidebar` entirely on compact widths

This is simpler than Craft’s “navigator or focused content” switching and matches the current app better.

- [ ] **Step 3: Wire trigger/collapse controls to compact shell**

The current top-bar trigger should open the compact drawer rather than attempt desktop collapse behavior.

- [ ] **Step 4: Manual validation**

In devtools responsive mode, verify:

- desktop widths drag correctly
- below threshold, the desktop shell disappears cleanly
- the session list remains reachable on mobile/compact

### Task 6: Make route content fill the new main panel

**Files:**
- Modify: `frontend/app/(app)/page.tsx`
- Modify: `frontend/app/(app)/c/[conversationId]/page.tsx`
- Modify: `frontend/features/chat/ChatView.tsx`
- Modify: `frontend/app/(app)/dashboard/page.tsx`
- Modify: `frontend/components/app-sidebar.tsx`

- [ ] **Step 1: Strip extra wrappers from the root conversation route**

Change `/app/(app)/page.tsx` so it renders `ChatContainer` inside a panel-filling wrapper only if required:

```tsx
return <ChatContainer key={uuid} conversationId={uuid} />
```

or:

```tsx
return <div className="h-full min-h-0"><ChatContainer ... /></div>
```

No bare wrapper divs with no layout purpose.

- [ ] **Step 2: Strip extra wrappers from the conversation detail route**

Remove the `Conversation {id}` heading and wrapper div from `/app/(app)/c/[conversationId]/page.tsx` so the main content panel is not polluted by route-level chrome.

- [ ] **Step 3: Make `ChatView` fill its parent instead of the viewport**

Replace this shape:

- `sm:max-w-[80%] lg:max-w-[60%] xl:max-w-[50%] mx-auto`
- nested `h-[90vh]`

with parent-filling structure, for example:

- outer wrapper: `flex h-full min-h-0 flex-col`
- inner centered content container: `mx-auto flex h-full w-full max-w-4xl min-h-0 flex-col`
- conversation area: `flex-1 min-h-0 overflow-y-auto`

This is mandatory; otherwise the new shell will feel broken.

- [ ] **Step 4: Remove nested shelling from dashboard**

`frontend/app/(app)/dashboard/page.tsx` must stop creating its own `SidebarProvider`, `AppSidebar`, and `SidebarInset`. Let `AppLayout` provide the shell once, globally.

- [ ] **Step 5: Delete or deprecate `AppSidebar`**

If nothing imports `frontend/components/app-sidebar.tsx` after the migration, remove it or leave a short comment marking it dead code to clean up next.

- [ ] **Step 6: Validate**

Run:
- `bun --cwd frontend typecheck`
- `bun --cwd frontend build`

Expected: PASS

---

## Chunk 4: Focus, polish, and verification

### Task 7: Preserve keyboard focus behavior across the new three-panel shell

**Files:**
- Modify: `frontend/features/nav-chats/sidebar-focus.tsx`
- Modify: `frontend/components/layout/left-sidebar-panel.tsx`
- Modify: `frontend/components/layout/session-list-panel.tsx`
- Modify: `frontend/components/app-layout.tsx`

- [ ] **Step 1: Keep the existing zone model**

The current zone order already matches the new shell:

- `sidebar`
- `navigator`
- `chat`

Do **not** rename zones unless absolutely necessary.

- [ ] **Step 2: Register the new left sidebar correctly**

`LeftSidebarPanel` should use the `sidebar` zone and focus its first actionable control.

- [ ] **Step 3: Keep `NavChats` as the navigator zone**

No new focus abstraction is needed; just verify it still receives keyboard focus after extraction.

- [ ] **Step 4: Keep the main content shell as `chat` zone**

The old `ChatFocusShell` behavior can survive with minimal changes.

- [ ] **Step 5: Manual validation**

Verify:

- `ArrowLeft` from a conversation goes to `navigator`
- another left move can go to `sidebar` if intended
- `ArrowRight` returns to `chat`
- clicking each panel updates zone ownership cleanly

### Task 8: Add resize polish and persistence checks

**Files:**
- Modify: `frontend/components/layout/desktop-three-panel-shell.tsx`
- Modify: `frontend/components/layout/resizable-sash.tsx`
- Modify: `frontend/store/layout-atoms.ts`

- [ ] **Step 1: Disable text selection while dragging**

Mirror Craft:

```ts
document.body.style.userSelect = 'none'
document.body.style.cursor = 'col-resize'
```

and always reset them on mouse up / cleanup.

- [ ] **Step 2: Animate sash position changes only when not actively dragging**

Use the same pattern Craft uses:

- no transition during drag
- `left 0.15s ease-out` when widths update from persisted state or collapse toggles

- [ ] **Step 3: Confirm persistence**

Reload the page and verify:

- left sidebar width restored
- session list width restored
- collapsed/visible state restored if implemented

- [ ] **Step 4: Optional double-click behavior**

If desired, double-click on a sash can reset to default width. This is not required for the first pass, but the sash component should leave room for it.

---

## Explicit Non-Goals for This Pass

These are tempting rabbit holes. Leave them in the wall for later.

- [ ] Do **not** port Craft’s full `panelStackAtom` / `PanelSlot` / `PanelResizeSash` content-strip engine yet.
- [ ] Do **not** rebuild `ChatContainer` into true multi-panel chat tabs yet.
- [ ] Do **not** mix `react-resizable-panels` desktop behavior with the new Craft-style manual shell.
  - Pick one system on desktop: the Craft-style shell.
- [ ] Do **not** leave nested shell providers (`SidebarProvider`, `SidebarInset`, `AppSidebar`) inside route pages.

---

## Implementation Notes / Decision Log

### Why Jotai goes into `pawrrtal` now

The Craft blueprint uses Jotai as the shell’s backing store. Even though `pawrrtal` only needs the left-rail subset today, adding Jotai now gives a clean home for layout state instead of stuffing more desktop shell state into `SidebarProvider` or `localStorage` helper functions.

### Why not use `react-resizable-panels` for this

`react-resizable-panels` is fine for the current 2-pane split, but Craft’s layout is not just “three panels in a group.” It depends on:

- fixed pixel left rails
- custom seam placement math
- document-level drag listeners
- compact-mode hiding rules
- a future path toward a separate content panel stack

That is a different beast.

### Why `NavChats` belongs in the middle panel

`NavChats` already behaves like a session navigator:

- search
- grouping
- selection
- keyboard list navigation

So it maps directly to Craft’s `SessionList`, not to the app-level left sidebar.

### What should go in `LeftSidebar`

Start small:

- `Chats` route shortcut
- `Dashboard` route shortcut
- collapse button
- optional brand/user footer

The important thing is to create the **layout slot** now. The exact app-nav content can evolve later.

---

## Verification Checklist

After implementation, verify all of this manually:

- [ ] Desktop shows three visible panels: `LeftSidebar`, `SessionList`, `MainContent`
- [ ] Left sidebar seam drags and persists
- [ ] Session list seam drags and persists
- [ ] Main content always fills remaining width
- [ ] `NavChats` still selects and focuses conversations correctly
- [ ] Chat page fills the right panel without `90vh` hacks
- [ ] Dashboard renders inside the shared shell, not a nested one
- [ ] Compact/mobile mode swaps to the fallback shell below the threshold
- [ ] Keyboard focus still moves `sidebar -> navigator -> chat`
- [ ] `bun --cwd frontend typecheck` passes
- [ ] `bun --cwd frontend build` passes

---

## Recommended Commit Sequence

1. `feat: add layout atoms and shell constants`
2. `feat: add craft-style desktop three-panel shell`
3. `refactor: move nav chats into session list panel`
4. `refactor: make chat routes fill main content shell`
5. `refactor: remove old desktop sidebar/resizable-panel wiring`
6. `feat: add compact shell fallback`
7. `chore: remove obsolete app sidebar shell`

---

Plan complete and saved to `docs/plan-resizable-panels.md`. Ready to execute?
