# Craft Agents UI Reskin

Fork Craft Agents OSS renderer code directly into our project. Their Electron app is just React running in Chromium — the renderer IS web code. We take it as-is, shim the thin Electron IPC layer (no-ops for now), replace their Jotai data layer with our hooks, and flatten `@craft-agent/ui` imports. Zero design interpretation needed. Bonus: keeping the Electron-compatible structure means we can wrap this in Electron later for a desktop app.

## Source Reference

- Repo: `lukilabs/craft-agents-oss`
- Electron app: `apps/electron/src/renderer/`
- Shared UI package: `packages/ui/`
- Key files: `index.css` (theme), `AppShell.tsx`, `TopBar.tsx`, `ChatDisplay.tsx`, `SessionList.tsx`, `FreeFormInput.tsx`

## Ground Rules

1. **Their renderer IS web code.** Electron renderer = React + Tailwind + Motion running in Chromium. We take it directly — no rewriting, no design interpretation.
2. **Shim, don't strip.** Instead of removing Electron APIs, create a thin shim layer (`lib/electron-shim.ts`) that no-ops IPC calls in the browser. This keeps the code Electron-compatible for a future desktop app.
3. **Replace only the data layer.** Swap their Jotai atoms and IPC-based data fetching with our hooks (`useChat`, `useGetConversations`, `useAuthedFetch`, etc.). Flatten `@craft-agent/ui` imports to local paths. Everything else stays as-is.
4. **Future Electron path.** By keeping the Electron structure intact (shimmed, not stripped), wrapping this in Electron later is straightforward — just replace the shims with real IPC handlers.
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

## Adaptation Playbook

For each Craft component we fork, the adaptation steps are:

1. **Copy** the source file from the Craft repo into our project
2. **Create Electron shim** (`lib/electron-shim.ts`): no-op implementations of `window.electron.*` APIs used by the component. This keeps code Electron-compatible for future desktop builds.
3. **Replace data layer**: Jotai atoms → our React hooks (`useGetConversations`, `useChat`, etc.) or local state
4. **Flatten imports**: `@craft-agent/ui` → local relative paths to our forked copies
5. **Wire to our hooks**: replace their IPC-based data-fetching with our `useAuthedFetch`-based hooks
6. **Verify it renders**: check that the component works in our Next.js app

## Execution Chunks

Each chunk is independently shippable and testable.

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

Fork their session list components. Replace Jotai session atoms with our `useGetConversations` hook. Wire navigation to Next.js `router.push`. Delete `nav-chats.tsx`.

**Verify**: conversations load and group by date, search filters work, clicking navigates to conversation, new conversation button works.

### Chunk 4: Chat Messages + Empty State + Loading

**Source**: Craft's `ChatDisplay.tsx`, `UserMessageBubble`, `TurnCard`, `EmptyStateHint.tsx`, `ProcessingIndicator`

Fork their chat display and message components. Replace their session/message atoms with our `chatHistory` prop from `ChatContainer`. Keep `Streamdown` for markdown rendering. Delete `message.tsx`, `loader.tsx`.

**Verify**: messages render in turns, streaming works, empty state cycles hints, loading shows timer.

### Chunk 5: Input Area & Model Selector

**Source**: Craft's `FreeFormInput.tsx`, `RichTextInput.tsx`, `InputContainer.tsx`, connection selector

Fork their input components wholesale. Wire submit to our `useChat` handler, model list to our `useModels` hook. Delete `prompt-input.tsx`, `model-selector.tsx`, `input-group.tsx`.

**Verify**: typing, sending, file attachments, model selection all work.

### Chunk 6: Polish & Consistency

**Source**: Craft's `ui/` primitives (Button, Badge, Dialog, etc.)

Fork Craft's shadcn/ui variants or restyle ours to match their token system. Update auth pages, toast overrides. Final consistency pass.

**Verify**: full app walkthrough, no visual inconsistencies, light/dark mode clean.
