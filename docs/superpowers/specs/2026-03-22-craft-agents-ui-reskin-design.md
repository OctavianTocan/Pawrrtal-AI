# Craft Agents UI Reskin

Fork Craft Agents OSS renderer code directly into our project. Their Electron app is React + Jotai + Tailwind + Motion running in Chromium — the renderer IS web code. We take it as-is, adopt Jotai for state management, shim the Electron IPC layer, and only rewire the data-fetching atoms that talk to their backend. This is effectively a UI fork of Craft Agents wired to our backend.

## Source Reference

- Repo: `lukilabs/craft-agents-oss`
- Electron app: `apps/electron/src/renderer/`
- Shared UI package: `packages/ui/`
- Key files: `index.css` (theme), `AppShell.tsx`, `TopBar.tsx`, `ChatDisplay.tsx`, `SessionList.tsx`, `FreeFormInput.tsx`

## Ground Rules

1. **Pure UI fork.** Take Craft's renderer code as-is. No rewriting, no design interpretation, no selective adoption. It's a fork.
2. **Adopt Jotai.** Keep their Jotai atoms for all UI state (sidebar, selections, panels, etc.). Only rewire the data-fetching atoms that call their backend — those get replaced with atoms that call our API via `useAuthedFetch`.
3. **Shim Electron.** Create `lib/electron-shim.ts` with no-op implementations of `window.electron.*` APIs. Keeps the code Electron-compatible — we can wrap in Electron later for a desktop app.
4. **Flatten `@craft-agent/ui`.** Their shared UI package lives at `packages/ui/` — copy those components locally and update import paths.
5. **New dependencies**: `jotai` (state management), keep existing `motion` v12 (already installed). Import Motion from `motion/react`.

## What Gets Replaced

### Theme & Design Tokens (globals.css — full rewrite)

Replace our current color system and glass variants with Craft's:

- **6-color system**: `background`, `foreground`, `accent`, `info`, `success`, `destructive` using OKLCH
- **`@property` definitions** for animatable CSS custom properties (smooth theme transitions in Chromium)
- **Shadow system**: layered shadows with opacity variants, light/dark mode adaptation — replaces our 4 glass utility classes (`glass-bg`, `glass-frosted`, `glass-fluted`, `glass-crystal`)
- **Foreground mix variants**: `--foreground-1.5` through `--foreground-95` using `color-mix()`
- **Z-index registry**: semantic stacking (`--z-base` through `--z-splash`, 0-600)
- **Custom scrollbar styling**: webkit scrollbars with hover states
- **Scenic mode**: `data-scenic="true"` attribute enables glassmorphism with backdrop blur on background images
- **Sonner toast integration**: tinted backgrounds matching their pattern

### App Shell & Top Bar (fork directly)

Our current layout: `NewSidebar` wraps `SidebarProvider > Sidebar + SidebarInset`. Header is a minimal 64px bar with sidebar toggle + separator.

Fork Craft's shell directly:
- **Panel.tsx**: base container (`h-full flex flex-col min-w-0 overflow-hidden`), two sizing variants (`grow`/`shrink`)
- **PanelHeader.tsx**: standardized 42px headers with left/center/right content areas, Motion animations for content shifting
- **TopBar.tsx**: fork as-is including traffic light offset logic (shimmed to no-op on web, functional in future Electron build)
- **AppShell layout**: sidebar + main content panel, replaces `SidebarInset` wrapper

### Sidebar: Session List (rewrite NavChats)

Our current sidebar: flat list of conversations with icon + truncated title via `Calligraph`.

Replace with Craft's `SessionList` + `SessionItem` pattern:
- **Date grouping**: conversations grouped by Today/Yesterday/This Week/Older with collapsible group headers
- **Search filtering**: client-side search across conversation titles
- **EntityRow base**: unified list item skeleton (left icon, title with optional badge/subtitle, trailing timestamp, hover-activated menu)
- **Visual indicators**: unread dots, processing spinners for active sessions
- **Motion animations**: expand/collapse animations with stagger effects on children
- **New Conversation button**: icon + label, styled consistently with Craft's nav items

**Behavior changes needed**:
- The `Conversation` type in `lib/types.ts` already includes `updated_at: string` — no backend changes needed for date grouping
- Client-side grouping utility to bucket conversations by date using `updated_at`

### Chat Messages (rewrite ChatView + message.tsx)

Our current messages: `Message` component with user (right-aligned, `bg-secondary`) vs assistant (left). `Streamdown` for markdown rendering.

Replace with Craft's pattern:
- **Turn-based grouping**: group consecutive messages into turns. `UserMessageBubble` for user turns, `TurnCard` for assistant turns
- **TurnCard**: collapsible header, response section — designed for long conversations where you want to collapse earlier turns
- **EmptyStateHint**: replace static gradient text with rotating workflow suggestions. Cycle through hint templates with inline entity badges
- **ProcessingIndicator**: replace `Loader` + "Thinking..." with cycling status strings + elapsed timer. The existing `loader.tsx` is deleted — `ProcessingIndicator` replaces it everywhere in the chat context. If a generic spinner is needed elsewhere, use a simple Motion-based spinner component.
- **Message entry animations**: Motion `AnimatePresence` for new messages appearing (fade + slide)
- **Markdown rendering**: keep `Streamdown` for now. Craft's `StreamingMarkdown` has better memoization (content hashing per block), but swapping the markdown renderer is a separate concern that can be evaluated after the reskin ships.

**Behavior changes needed**:
- Turn-grouping utility function: takes flat message array, returns grouped turns
- Timer state for `ProcessingIndicator` (track when streaming started)

### Input Area & Model Selector (wholesale replace)

Our current input: `PromptInput` form (~1400 lines) with `InputGroup`, `PromptInputTextarea`, `ModelSelector` combobox, `PromptInputSubmit`. The `ModelSelector` is non-functional (single hardcoded model).

**Approach: grab Craft's `FreeFormInput` wholesale.** Take their component with its internal behavior (auto-growing textarea, attachment handling, model/connection selection, status indicators). Wire it to our `useChat` submit handler and streaming state. Delete our `prompt-input.tsx`, `model-selector.tsx`, and `input-group.tsx` — they're fully replaced, not refactored.

What we adopt from Craft:
- **FreeFormInput**: their complete input component with its styling and behavior
- **Connection/model selector**: their grouped selector pattern, wired to our `useModels` hook
- **Attachment handling**: their drag/drop/paste/preview approach replaces ours
- **ToolbarStatusSlot**: contextual status indicators (streaming state, etc.)
- **Input chrome**: borders, backgrounds, focus states, spacing — all Craft's

### Animations (Motion throughout)

Apply Motion (v12, already installed) animation patterns from Craft:

- **Sidebar expand/collapse**: spring-based width transition
- **Session list items**: stagger effect on initial render, slide-in for new items
- **Message entry**: fade + translateY on new messages
- **Loading states**: AnimatePresence for enter/exit of ProcessingIndicator
- **PanelHeader content**: spring animations for content shifting (e.g., title changes)
- **Page transitions**: subtle fade between routes

Spring configs to adopt from Craft: `{ type: "spring", stiffness: 300, damping: 30 }` as baseline.

### shadcn/ui Components (restyle all)

All existing `ui/*.tsx` components get restyled to use the new token system:
- `button.tsx`, `dialog.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `scroll-area.tsx`, etc.
- Auth pages (`login/signup`) restyled to match
- Toast overrides updated for new shadow/color system

## What We Keep (backend integration only)

The only code we keep is what connects to our backend. Everything else is Craft's.

- `useAuthedFetch` / `useAuthedQuery` — auth layer for API calls
- `lib/api.ts` — API endpoint definitions
- `lib/types.ts` — backend response types
- Next.js app router structure (`app/(app)/`, `app/(auth)/`, route params)
- Auth pages (`login/signup`) — restyled but structurally kept since they're our auth flow

Everything that was previously in our hooks (`useChat`, `useCreateConversation`, `useGetConversations`, `useModels`) gets rewritten as **Jotai atoms** that call our API, matching Craft's data-fetching patterns. This way the forked components work without any prop-drilling or adapter layers.

## Adaptation Playbook

For each Craft component we fork, the adaptation steps are:

1. **Copy** the source file from the Craft repo into our project
2. **Flatten imports**: `@craft-agent/ui` → local relative paths to our forked copies
3. **Rewire data-fetching atoms only**: find Jotai atoms that call their backend via IPC → replace with atoms that call our API via `useAuthedFetch`. Keep all UI-state atoms as-is.
4. **Electron shim** (`lib/electron-shim.ts`): created once, provides no-op implementations of `window.electron.*` APIs. All components import from the shim.
5. **Verify it renders**: check that the component works in our Next.js app

Note: steps 2-4 are mostly mechanical find-and-replace. UI state atoms, component logic, styling, and animations are untouched.

## Execution Chunks

Each chunk is independently shippable and testable.

### Chunk 0: Foundation (Jotai + Electron Shim + Package Imports)

**Tasks**:
- Install `jotai` dependency
- Create `lib/electron-shim.ts` with no-op implementations of Craft's `window.electron.*` API surface
- Clone Craft's `packages/ui/` components into our project (local path, not package import)
- Create Jotai atoms for our backend data-fetching: sessions atom (calls our conversations API), messages atom (calls our chat API), models atom (calls our models API) — all using `useAuthedFetch` under the hood
- Delete our current hooks that get replaced by atoms: `useGetConversations`, `useChat`, `useCreateConversation`, `useGenerateConversationTitle`, `useModels` (their logic moves into atoms)

**Verify**: `jotai` installed, shim imports resolve, `@craft-agent/ui` imports resolve to local paths, data-fetching atoms return data from our API.

### Chunk 1: Design Tokens & Theme

**Source**: Craft's `index.css` (theme system)

Fork Craft's CSS into our `globals.css`. Their 6-color system, `@property` definitions, shadow system, z-index registry, foreground mix variants, scrollbar styles, scenic mode. Delete our 4 glass utility classes and all associated CSS variables.

**Verify**: app renders with new colors, light/dark mode works, existing components look different but don't break.

### Chunk 2: App Shell & Top Bar

**Source**: Craft's `AppShell.tsx`, `TopBar.tsx`, `Panel.tsx`, `PanelHeader.tsx`

Fork their shell components as-is. Shim Electron APIs (traffic light offsets become no-ops on web). Adapt to wrap our Next.js layout. Replace `new-sidebar.tsx` and update `app/(app)/layout.tsx`.

**Verify**: sidebar toggles, content area fills correctly, TopBar renders with sidebar control.

### Chunk 3: Sidebar Session List

**Source**: Craft's `SessionList.tsx`, `SessionItem.tsx`, `EntityRow.tsx`, `LeftSidebar.tsx`

Fork their session list components with Jotai atoms intact. Rewire the session-data atom to fetch from our API instead of IPC. Wire navigation to Next.js `router.push`. Delete `nav-chats.tsx`.

**Verify**: conversations load and group by date, search filters work, clicking navigates to conversation, new conversation button works.

### Chunk 4: Chat Messages + Empty State + Loading

**Source**: Craft's `ChatDisplay.tsx`, `UserMessageBubble`, `TurnCard`, `EmptyStateHint.tsx`, `ProcessingIndicator`

Fork their chat display and message components with Jotai atoms intact. Rewire message-data atoms to our API. Keep `Streamdown` for markdown rendering (or adopt their `StreamingMarkdown` if it comes along easily). Delete our `message.tsx`, `loader.tsx`.

**Verify**: messages render in turns, streaming works, empty state cycles hints, loading shows timer.

### Chunk 5: Input Area & Model Selector

**Source**: Craft's `FreeFormInput.tsx`, `RichTextInput.tsx`, `InputContainer.tsx`, connection selector

Fork their input components with all internal logic intact. Rewire the submit atom to call our API, model-list atom to fetch our models. Delete our `prompt-input.tsx`, `model-selector.tsx`, `input-group.tsx`.

**Verify**: typing, sending, file attachments, model selection all work.

### Chunk 6: Polish & Consistency

**Source**: Craft's `ui/` primitives (Button, Badge, Dialog, etc.)

Fork Craft's shadcn/ui variants or restyle ours to match their token system. Update auth pages, toast overrides. Final consistency pass.

**Verify**: full app walkthrough, no visual inconsistencies, light/dark mode clean.
