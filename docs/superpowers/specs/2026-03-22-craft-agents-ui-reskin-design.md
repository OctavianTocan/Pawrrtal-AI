# Craft Agents UI Reskin

Wholesale replacement of all Minnetonka frontend UI components with Craft Agents OSS equivalents. Grab their components, styling, behavior, and animations. Wire them to our hooks and backend. The only things we keep are the integration layer: hooks, API calls, auth, routing, and backend types.

## Source Reference

- Repo: `lukilabs/craft-agents-oss`
- Electron app: `apps/electron/src/renderer/`
- Shared UI package: `packages/ui/`
- Key files: `index.css` (theme), `AppShell.tsx`, `TopBar.tsx`, `ChatDisplay.tsx`, `SessionList.tsx`, `FreeFormInput.tsx`

## Ground Rules

1. **Grab wholesale.** Take Craft's components — styling, behavior, internal state, animations — as-is. Don't preserve our UI component logic; replace it entirely.
2. **Wire to our hooks.** The integration boundary is our hooks and backend: `useChat`, `useCreateConversation`, `useGetConversations`, `useAuthedFetch`, Next.js routing, API types. These stay. Everything above them gets replaced.
3. **Don't over-adapt.** If Craft's component does something slightly differently than ours (attachments, input behavior, model selection), take their approach. Only deviate when something is truly Electron-specific and has no web equivalent.
4. **Electron to web equivalents.** Craft is Electron — we build web equivalents that capture the same visual feel (TopBar without traffic lights, no IPC, standard web scrollbars with custom styling, responsive breakpoints).
5. **Animation library: Motion (v12).** Already in `package.json` as `"motion": "^12.34.0"`. Import from `motion/react` (not the legacy `framer-motion` package). Provides springs, stagger, `AnimatePresence`.

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

### App Shell & Top Bar (new components)

Our current layout: `NewSidebar` wraps `SidebarProvider > Sidebar + SidebarInset`. Header is a minimal 64px bar with sidebar toggle + separator.

Replace with Craft's pattern:
- **Panel.tsx**: base container (`h-full flex flex-col min-w-0 overflow-hidden`), two sizing variants (`grow`/`shrink`)
- **PanelHeader.tsx**: standardized 42px headers with left/center/right content areas, Motion animations for content shifting
- **TopBar.tsx** (web equivalent): persistent bar with sidebar toggle, app title/breadcrumbs, and right-side utility area. No traffic light offsets or IPC — web-native implementation capturing the same visual density and layout
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

## What We Keep (the integration layer)

Only hooks, backend integration, and routing survive. Everything else is replaced.

- `useChat` hook — streaming logic, message accumulation
- `useCreateConversation` + `useGenerateConversationTitle` mutations
- `useGetConversations` — conversation list query
- `useModels` — model list query (wired into Craft's selector)
- `useAuthedFetch` / `useAuthedQuery` auth layer
- `ChatContainer` state management (URL sync, stream loop, optimistic messages) — may need light adaptation to interface with Craft's components
- Next.js app router structure (`app/(app)/`, `app/(auth)/`, route params)
- `Streamdown` for markdown rendering (Craft's `StreamingMarkdown` is a potential future upgrade but out of scope)
- Backend API integration (`lib/api.ts`, `lib/types.ts`)

## Execution Chunks

Each chunk is independently shippable and testable.

### Chunk 1: Design Tokens & Theme

**Files**: `globals.css` (rewrite), tailwind config updates

Rewrite `globals.css` with Craft's 6-color system, `@property` definitions, shadow system, z-index registry, foreground mix variants, scrollbar styles, scenic mode support. Remove all 4 glass variants (standard, frosted, fluted, crystal) and replace with Craft's shadow/surface approach.

**Verify**: app renders with new colors, light/dark mode works, no visual regressions in existing components (they'll look different but shouldn't break).

### Chunk 2: App Shell & Top Bar

**Files**: `new-sidebar.tsx` (rewrite), `app/(app)/layout.tsx` (adapt), new `TopBar.tsx`, `Panel.tsx`, `PanelHeader.tsx`

New layout structure with Craft's proportions. TopBar as web equivalent of their Electron top bar. PanelHeader for consistent headers.

**Verify**: sidebar toggles, content area fills correctly, TopBar renders with sidebar control.

### Chunk 3: Sidebar Session List

**Files**: `nav-chats.tsx` (rewrite), new `SessionList.tsx`, `SessionItem.tsx`, `EntityRow.tsx`, `get-conversations.ts` (adapt if needed)

Craft-style session list with date grouping, search, badges. Motion animations.

**Verify**: conversations load and group by date, search filters work, clicking navigates to conversation, new conversation button works.

### Chunk 4: Chat Messages + Empty State + Loading

**Files**: `ChatView.tsx` (rewrite), `message.tsx` (rewrite), new `TurnCard.tsx`, `EmptyStateHint.tsx`, `ProcessingIndicator.tsx`, `loader.tsx` (delete — replaced by ProcessingIndicator)

Turn-based message grouping, rotating empty state hints, processing indicator with timer.

**Verify**: messages render in turns, streaming works, empty state cycles hints, loading shows timer.

### Chunk 5: Input Area & Model Selector

**Files**: `prompt-input.tsx` (delete, replace with Craft's FreeFormInput), `model-selector.tsx` (delete, replace with Craft's selector), `input-group.tsx` (delete)

Wholesale replacement of input area with Craft's components. Wire to our hooks.

**Verify**: typing, sending, file attachments, model selection all work with new styling.

### Chunk 6: Polish & Consistency

**Files**: all `ui/*.tsx`, auth pages, toast overrides

Final pass — every shadcn/ui component uses new tokens, auth pages match, toasts styled correctly.

**Verify**: full app walkthrough, no visual inconsistencies, light/dark mode clean.
