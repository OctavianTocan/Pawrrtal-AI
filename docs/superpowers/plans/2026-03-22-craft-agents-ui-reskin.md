# Craft Agents UI Reskin — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork Craft Agents OSS renderer into our Next.js app, wired to our backend API.

**Architecture:** Pure UI fork. Take Craft's Electron renderer code (React + Jotai + Tailwind + Motion) as-is. Shim Electron IPC. Create Jotai atoms that wrap our TanStack Query hooks for data fetching. Flatten `@craft-agent/ui` imports to local paths.

**Tech Stack:** React 19, Next.js 16, Jotai (new), TanStack Query (existing), Motion v12 (existing), Tailwind v4 (existing), Radix UI (existing)

**Source repo:** `lukilabs/craft-agents-oss` — clone locally for file copying.

---

## Chunk 0: Foundation — Clone Source, Install Dependencies, Create Shim

This chunk sets up everything the subsequent chunks depend on: the Craft source available locally, Jotai installed, Electron APIs shimmed, and data-fetching atoms created.

### Task 0.1: Clone Craft Agents repo locally

**Files:**
- Create: `.craft-source/` (gitignored working copy)

- [ ] **Step 1: Add .craft-source to .gitignore**

```
# Craft Agents source (working copy for fork)
.craft-source/
```

Append to the project root `.gitignore`.

- [ ] **Step 2: Clone the repo**

Run:
```bash
git clone --depth 1 https://github.com/lukilabs/craft-agents-oss.git .craft-source
```

Expected: `.craft-source/apps/electron/src/renderer/` and `.craft-source/packages/ui/src/` exist.

- [ ] **Step 3: Verify key source files exist**

Run:
```bash
ls .craft-source/apps/electron/src/renderer/index.css
ls .craft-source/apps/electron/src/renderer/components/app-shell/AppShell.tsx
ls .craft-source/packages/ui/src/components/chat/TurnCard.tsx
```

Expected: all three exist.

- [ ] **Step 4: Commit .gitignore change**

```bash
git add .gitignore
git commit -m "chore: gitignore .craft-source working copy"
```

### Task 0.2: Install Jotai

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install jotai**

Run from project root:
```bash
cd frontend && bun add jotai
```

Expected: `jotai` appears in `package.json` dependencies.

- [ ] **Step 2: Verify import works**

Create a quick smoke test — in any file, confirm `import { atom } from 'jotai'` resolves without errors during `bun run typecheck`.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json bun.lock
git commit -m "chore: add jotai dependency"
```

### Task 0.3: Create Electron IPC shim

**Files:**
- Create: `frontend/lib/electron-shim.ts`

This file provides no-op implementations for every `window.electronAPI` method that Craft's renderer components call. Components import from this shim instead of accessing `window.electronAPI` directly. When we wrap in Electron later, we replace this with real IPC.

- [ ] **Step 1: Create the shim file**

```typescript
/**
 * Electron API shim for web.
 *
 * No-op implementations of window.electronAPI methods used by Craft's
 * renderer components. Replace with real Electron IPC when wrapping
 * in Electron.
 */

const noop = () => {};
const noopAsync = async () => {};
const noopAsyncNull = async () => null;
const noopAsyncEmpty = async () => [];
const noopSubscribe = (_callback: (...args: unknown[]) => void) => noop;

export const electronAPI = {
  // Session management
  sessionCommand: noopAsync,
  getSessions: noopAsyncEmpty,
  onSessionEvent: noopSubscribe,
  cancelProcessing: noopAsync,
  respondToPermission: noopAsync,
  respondToCredential: noopAsync,

  // File operations
  readFile: noopAsyncNull as (path: string) => Promise<string | null>,
  readFileDataUrl: noopAsyncNull as (path: string) => Promise<string | null>,
  readFileBinary: noopAsyncNull as (path: string) => Promise<Uint8Array | null>,
  openFile: noopAsync,
  openFileDialog: noopAsyncEmpty as () => Promise<string[]>,
  readFileAttachment: noopAsyncNull,
  showInFolder: noopAsync,
  getSessionFiles: noopAsyncEmpty,
  watchSessionFiles: noopAsync,
  onSessionFilesChanged: noopSubscribe,
  unwatchSessionFiles: noop,

  // Workspace and window management
  getWorkspaces: noopAsyncEmpty,
  getWindowWorkspace: noopAsyncNull,
  setTrafficLightsVisible: noop as (visible: boolean) => void,

  // System and utility
  getLatestReleaseVersion: noopAsyncNull as () => Promise<string | null>,
  getHomeDir: noopAsyncNull as () => Promise<string | null>,
  onAutomationsChanged: noopSubscribe,
  testAutomation: noopAsync,
  getAutomationLastExecuted: noopAsyncNull,
};

// Install globally for components that access window.electronAPI directly
if (typeof window !== "undefined") {
  (window as any).electronAPI = electronAPI;
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd frontend && bun run typecheck`

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/electron-shim.ts
git commit -m "feat: add Electron IPC shim for web"
```

### Task 0.4: Create Jotai data-fetching atoms

**Files:**
- Create: `frontend/atoms/sessions.ts`
- Create: `frontend/atoms/messages.ts`
- Create: `frontend/atoms/models.ts`
- Create: `frontend/atoms/index.ts`

These atoms wrap our existing TanStack Query logic in Jotai's interface so Craft's forked components can consume them. We use `jotai-tanstack-query` or manual atom + useQuery patterns.

- [ ] **Step 1: Install jotai-tanstack-query integration**

Run:
```bash
cd frontend && bun add jotai-tanstack-query
```

- [ ] **Step 2: Create sessions atom**

```typescript
// frontend/atoms/sessions.ts
import { atom } from "jotai";
import type { Conversation } from "@/lib/types";

/**
 * Conversations list atom.
 * Populated by TanStack Query via the component that provides data.
 * Craft's components read from this atom instead of IPC.
 */
export const conversationsAtom = atom<Conversation[]>([]);

/** Currently selected conversation ID */
export const selectedConversationIdAtom = atom<string | null>(null);

/** Derived: currently selected conversation */
export const selectedConversationAtom = atom((get) => {
  const id = get(selectedConversationIdAtom);
  const conversations = get(conversationsAtom);
  return conversations.find((c) => c.id === id) ?? null;
});
```

- [ ] **Step 3: Create messages atom**

```typescript
// frontend/atoms/messages.ts
import { atom } from "jotai";
import type { AgnoMessage } from "@/lib/types";

/** Messages for the active conversation */
export const messagesAtom = atom<AgnoMessage[]>([]);

/** Whether the assistant is currently streaming */
export const isStreamingAtom = atom(false);

/** Timestamp when streaming started (for ProcessingIndicator timer) */
export const streamingStartedAtAtom = atom<number | null>(null);
```

- [ ] **Step 4: Create models atom**

```typescript
// frontend/atoms/models.ts
import { atom } from "jotai";

export interface Model {
  id: string;
  name: string;
  provider: string;
}

/** Available models list */
export const modelsAtom = atom<Model[]>([]);

/** Currently selected model ID */
export const selectedModelIdAtom = atom<string>("gemini-3-flash-preview");
```

- [ ] **Step 5: Create barrel export**

```typescript
// frontend/atoms/index.ts
export * from "./sessions";
export * from "./messages";
export * from "./models";
```

- [ ] **Step 6: Extract PromptInputMessage type for cross-chunk compatibility**

Our `ChatContainer` imports `PromptInputMessage` from `prompt-input.tsx` which gets deleted in Chunk 5. Extract this type now so it survives:

```typescript
// Add to frontend/lib/types.ts
export interface PromptInputMessage {
  content: string;
  files: Array<{ type: "file"; url: string; mediaType: string; filename: string }>;
}
```

Update `ChatContainer.tsx` to import from `@/lib/types` instead of `@/components/ai-elements/prompt-input`.

- [ ] **Step 7: Verify typecheck passes**

Run: `cd frontend && bun run typecheck`

- [ ] **Step 8: Commit**

```bash
git add frontend/atoms/ frontend/lib/types.ts frontend/features/chat/ChatContainer.tsx
git commit -m "feat: add Jotai data-fetching atoms for backend integration"
```

**Note:** Existing hooks (`useGetConversations`, `useChat`, `useCreateConversation`, `useGenerateConversationTitle`, `useModels`) are NOT deleted yet. They continue to work alongside the new atoms. Deletion happens incrementally as each chunk rewires its consumers to use atoms directly. By end of Chunk 5, all consumers will use atoms and the old hooks can be cleaned up in Chunk 6.

### Task 0.5: Copy Craft's packages/ui components locally

**Files:**
- Create: `frontend/components/craft-ui/` (flat copy of `packages/ui/src/`)

- [ ] **Step 1: Copy the package**

```bash
cp -r .craft-source/packages/ui/src/ frontend/components/craft-ui/
```

- [ ] **Step 2: Verify key files exist**

```bash
ls frontend/components/craft-ui/components/chat/TurnCard.tsx
ls frontend/components/craft-ui/components/ui/entity-row.tsx
ls frontend/components/craft-ui/styles/index.css
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/craft-ui/
git commit -m "feat: fork Craft packages/ui components locally"
```

---

## Chunk 1: Design Tokens & Theme

### Task 1.1: Fork Craft's CSS into globals.css

**Files:**
- Modify: `frontend/app/globals.css` (full rewrite)
- Source: `.craft-source/apps/electron/src/renderer/index.css`

- [ ] **Step 1: Read Craft's index.css to understand structure**

Read `.craft-source/apps/electron/src/renderer/index.css`. Identify:
- `@property` definitions
- Color system variables
- Shadow system
- Z-index registry
- Scrollbar styles
- Animation keyframes
- Scenic mode styles
- Sonner toast overrides

- [ ] **Step 2: Replace globals.css**

Copy Craft's `index.css` content into `frontend/app/globals.css`. Keep our Tailwind v4 `@import` statements at the top and `@theme inline` block (adapting its variables to match Craft's token names). Remove all our glass utility classes and associated CSS variables.

Key adaptations:
- Keep `@import "tailwindcss"` and `@import "tw-animate-css"` at top
- Map Craft's 6-color system into our `@theme inline` block
- Bring in their `@property` definitions, shadow system, z-index registry
- Bring in their scrollbar, scenic mode, toast, and animation styles
- Remove all `--glass-*` variables and `.glass-*` utility classes

- [ ] **Step 3: Verify the app still renders**

Run: `cd frontend && bun run dev`

Open the app in a browser. It will look different (new colors) but should not crash. Existing components may look wrong — that's expected and will be fixed in later chunks.

- [ ] **Step 4: Verify typecheck**

Run: `cd frontend && bun run typecheck`

- [ ] **Step 5: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat: replace theme with Craft Agents design tokens"
```

### Task 1.2: Remove glass utility references from existing components

**Files:**
- Modify: any files that reference `glass-bg`, `glass-frosted`, `glass-fluted`, `glass-crystal`

- [ ] **Step 1: Find all glass utility references**

Run:
```bash
grep -r "glass-" frontend/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Delete glass-specific files entirely**

These files exist solely for glass effects and should be deleted:
```bash
rm frontend/lib/glass-utils.ts
rm -rf frontend/components/ui/glass/
```

- [ ] **Step 3: Remove glass class references from remaining files**

For each file found in Step 1 (excluding the deleted files), remove `glass-bg`, `glass-frosted`, `glass-fluted`, `glass-crystal` from className strings. Replace with appropriate Craft equivalents from the new theme (e.g., standard background + shadow classes).

Also check for imports of the deleted files:
```bash
grep -r "glass-utils\|glass/button-group" frontend/ --include="*.tsx" --include="*.ts" -l
```

Remove or replace those imports.

- [ ] **Step 4: Verify app renders without errors**

Run: `cd frontend && bun run dev`

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "fix: remove glass utility references and files for new theme"
```

---

## Chunk 2: App Shell & Top Bar

### Task 2.1: Fork Craft's shell components

**Files:**
- Create: `frontend/components/shell/AppShell.tsx`
- Create: `frontend/components/shell/Panel.tsx`
- Create: `frontend/components/shell/PanelHeader.tsx`
- Create: `frontend/components/shell/TopBar.tsx`
- Create: `frontend/components/shell/LeftSidebar.tsx`
- Create: `frontend/components/shell/MainContentPanel.tsx`
- Source: `.craft-source/apps/electron/src/renderer/components/app-shell/`

- [ ] **Step 1: Copy shell component files**

```bash
mkdir -p frontend/components/shell
cp .craft-source/apps/electron/src/renderer/components/app-shell/AppShell.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/Panel.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/PanelHeader.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/TopBar.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/LeftSidebar.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/MainContentPanel.tsx frontend/components/shell/
```

- [ ] **Step 2: Fix imports in each file**

For each copied file:
1. Replace `@craft-agent/ui` imports → `@/components/craft-ui/...`
2. Replace `@/atoms/` imports → `@/atoms/`  (should match since we created our atoms at the same path)
3. Replace `window.electronAPI.*` calls → import from `@/lib/electron-shim`
4. Replace relative imports to other app-shell components → `@/components/shell/...`
5. Fix any `@/hooks/` imports → copy the required hook or create a stub

This is mechanical find-and-replace per file. Work through compile errors one at a time.

- [ ] **Step 3: Create missing hook stubs as needed**

Some hooks referenced by shell components (e.g., `useTheme`, `useFocusZone`) may not exist yet. Create minimal stubs in `frontend/hooks/` that return sensible defaults. These get fleshed out as we fork more components.

- [ ] **Step 4: Verify typecheck**

Run: `cd frontend && bun run typecheck`

Fix any remaining type errors. The goal is compiling, not rendering perfectly yet.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/shell/
git commit -m "feat: fork Craft app shell components"
```

### Task 2.2: Wire AppShell into Next.js layout

**Files:**
- Modify: `frontend/app/(app)/layout.tsx`
- Delete: `frontend/components/new-sidebar.tsx` (replaced)
- Delete: `frontend/components/app-sidebar.tsx` (replaced)

- [ ] **Step 1: Update the app layout**

Replace the `NewSidebar` wrapper in `app/(app)/layout.tsx` with Craft's `AppShell`:

```typescript
import { AppShell } from "@/components/shell/AppShell";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 2: Delete old sidebar components**

```bash
rm frontend/components/new-sidebar.tsx
rm frontend/components/app-sidebar.tsx
```

- [ ] **Step 3: Fix any remaining import references to deleted files**

Run:
```bash
grep -r "new-sidebar\|app-sidebar\|NewSidebar\|AppSidebar" frontend/ --include="*.tsx" --include="*.ts" -l
```

Key known reference: `frontend/app/(app)/dashboard/page.tsx` imports `AppSidebar`. Either:
- Update it to use the new shell (if dashboard is still needed), or
- Delete the dashboard page if it's superseded by the new shell layout

Fix all found references before proceeding.

- [ ] **Step 4: Verify the app renders with new shell**

Run: `cd frontend && bun run dev`

The layout should show Craft's shell structure. Sidebar content and chat area may be empty/broken — that's addressed in later chunks.

- [ ] **Step 5: Commit**

```bash
git add -u && git add frontend/app/\(app\)/layout.tsx
git commit -m "feat: wire Craft AppShell into Next.js layout"
```

---

## Chunk 3: Sidebar — Session List

### Task 3.1: Fork session list components

**Files:**
- Create: `frontend/components/shell/SessionList.tsx`
- Create: `frontend/components/shell/SessionItem.tsx`
- Create: `frontend/components/shell/SessionSearchHeader.tsx`
- Source: `.craft-source/apps/electron/src/renderer/components/app-shell/`

- [ ] **Step 1: Copy session list files**

```bash
cp .craft-source/apps/electron/src/renderer/components/app-shell/SessionList.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/SessionItem.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/SessionSearchHeader.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/SessionBadges.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/SessionStatusIcon.tsx frontend/components/shell/
cp .craft-source/apps/electron/src/renderer/components/app-shell/SessionMenu.tsx frontend/components/shell/
```

- [ ] **Step 2: Copy required hooks**

```bash
cp .craft-source/apps/electron/src/renderer/hooks/useSessionSearch.ts frontend/hooks/
cp .craft-source/apps/electron/src/renderer/hooks/useEntityListInteractions.ts frontend/hooks/
cp .craft-source/apps/electron/src/renderer/hooks/useSession.ts frontend/hooks/
cp .craft-source/apps/electron/src/renderer/hooks/useSessionActions.ts frontend/hooks/
```

- [ ] **Step 3: Copy required utility files**

```bash
cp .craft-source/apps/electron/src/renderer/utils/session.ts frontend/lib/craft-session-utils.ts
cp .craft-source/apps/electron/src/renderer/utils/session-list-collapse.ts frontend/lib/session-list-collapse.ts
```

- [ ] **Step 4: Fix imports in all copied files**

For **each of the 12 copied files**, fix these import patterns:

**In SessionList.tsx, SessionItem.tsx, SessionSearchHeader.tsx, SessionBadges.tsx, SessionStatusIcon.tsx, SessionMenu.tsx:**
- `@craft-agent/ui` → `@/components/craft-ui/...` (Tooltip, Badge, DropdownMenu, etc.)
- `@/atoms/sessions` → `@/atoms/sessions` (rewire to use our `craftSessionsAtom` adapter)
- `@/components/app-shell/...` → `@/components/shell/...`
- `@/components/ui/...` → check if component exists in our `ui/` or `craft-ui/`, fix path accordingly
- `window.electronAPI.*` → import `electronAPI` from `@/lib/electron-shim`
- Lucide icon imports should work as-is (we have `lucide-react`)

**In useSessionSearch.ts, useEntityListInteractions.ts, useSession.ts, useSessionActions.ts:**
- `@/atoms/sessions` → `@/atoms/sessions`
- `@craft-agent/shared` → extract needed types locally or inline them
- `@/lib/local-storage` → fork from `.craft-source/apps/electron/src/renderer/lib/local-storage.ts` or stub
- `window.electronAPI.*` → `@/lib/electron-shim`

**In craft-session-utils.ts, session-list-collapse.ts:**
- `@craft-agent/shared` → inline needed types
- `date-fns` → install if not present: `cd frontend && bun add date-fns`

- [ ] **Step 5: Rewire session data atom**

In the SessionList component, find where it reads session data from Jotai atoms. Replace with our `conversationsAtom`. The key mapping:
- Craft's session → our `Conversation` type
- Craft's session.id → our conversation.id
- Craft's session title → our conversation.title
- Craft's session timestamp → our conversation.updated_at

Create an adapter atom if the shapes differ significantly:

```typescript
// frontend/atoms/sessions.ts (add to existing)
import { atom } from "jotai";
import type { Conversation } from "@/lib/types";

/** Adapter: map our Conversation type to Craft's expected session shape */
export const craftSessionsAtom = atom((get) => {
  const conversations = get(conversationsAtom);
  return conversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    // Add any other fields Craft's SessionItem expects with sensible defaults
    status: "idle" as const,
    isProcessing: false,
    unread: false,
  }));
});
```

- [ ] **Step 6: Delete old nav-chats**

```bash
rm frontend/components/nav-chats.tsx
rm frontend/components/nav-user.tsx
```

- [ ] **Step 7: Verify session list renders**

Run: `cd frontend && bun run dev`

Log in, verify conversation list appears in the sidebar with date grouping.

- [ ] **Step 8: Commit**

```bash
git add -u && git add frontend/components/shell/ frontend/hooks/ frontend/lib/ frontend/atoms/
git commit -m "feat: fork Craft session list with date grouping and search"
```

---

## Chunk 4: Chat Messages + Empty State + Loading

### Task 4.1: Fork chat display components

**Files:**
- Create: `frontend/components/chat/ChatDisplay.tsx`
- Create: `frontend/components/chat/EmptyStateHint.tsx`
- Create: `frontend/components/chat/ProcessingIndicator.tsx`
- Source: `.craft-source/apps/electron/src/renderer/components/app-shell/ChatDisplay.tsx`
- Source: `.craft-source/apps/electron/src/renderer/components/chat/EmptyStateHint.tsx`
- Source: `.craft-source/packages/ui/src/components/chat/TurnCard.tsx`

- [ ] **Step 1: Copy chat display files**

```bash
mkdir -p frontend/components/chat
cp .craft-source/apps/electron/src/renderer/components/app-shell/ChatDisplay.tsx frontend/components/chat/
cp .craft-source/apps/electron/src/renderer/components/chat/EmptyStateHint.tsx frontend/components/chat/
```

Copy TurnCard and related from packages/ui:
```bash
cp .craft-source/packages/ui/src/components/chat/TurnCard.tsx frontend/components/chat/
cp .craft-source/packages/ui/src/components/chat/turn-utils.ts frontend/components/chat/
```

- [ ] **Step 2: Copy required hooks**

```bash
cp .craft-source/apps/electron/src/renderer/hooks/useTurnCardExpansion.ts frontend/hooks/
```

- [ ] **Step 3: Fix imports in all copied files**

For **each copied chat file**, fix these import patterns:

**In ChatDisplay.tsx:**
- `@/atoms/sessions` → `@/atoms/messages` (read from `messagesAtom`, `isStreamingAtom`)
- `@craft-agent/ui` → `@/components/craft-ui/...`
- `@/components/app-shell/...` → `@/components/shell/...` or `@/components/chat/...`
- **Markdown rendering decision**: ChatDisplay imports `StreamingMarkdown` from Craft. For now, fork it too:
  ```bash
  cp .craft-source/packages/ui/src/components/markdown/ frontend/components/craft-ui/components/markdown/
  ```
  If this creates too many dependencies, replace the import with our `Streamdown` component instead.
- `window.electronAPI.*` → `@/lib/electron-shim`
- `sonner` → already in dependencies (verify with `grep sonner frontend/package.json`)

**In TurnCard.tsx, turn-utils.ts:**
- `@craft-agent/ui` internal imports → relative paths within `@/components/chat/`
- `@craft-agent/shared` types → inline or extract to `@/lib/types.ts`

**In EmptyStateHint.tsx:**
- `@craft-agent/ui` → `@/components/craft-ui/...`
- Entity badge imports → fork or stub

- [ ] **Step 4: Rewire ChatContainer to populate atoms**

Modify `frontend/features/chat/ChatContainer.tsx` to write to Jotai atoms instead of (or in addition to) local state:

```typescript
import { useSetAtom } from "jotai";
import { messagesAtom, isStreamingAtom, streamingStartedAtAtom } from "@/atoms";

// Inside ChatContainer:
const setMessages = useSetAtom(messagesAtom);
const setIsStreaming = useSetAtom(isStreamingAtom);
const setStreamingStartedAt = useSetAtom(streamingStartedAtAtom);

// When chat history updates:
setChatHistory((prev) => {
  const updated = [...prev, ...newMessages];
  setMessages(updated); // sync to atom
  return updated;
});

// When streaming starts/stops:
setIsStreaming(true);
setStreamingStartedAt(Date.now());
// ... after streaming:
setIsStreaming(false);
setStreamingStartedAt(null);
```

- [ ] **Step 5: Update ChatView to use forked ChatDisplay**

Replace `frontend/features/chat/ChatView.tsx` to use the forked `ChatDisplay` instead of our old message rendering:

```typescript
import ChatDisplay from "@/components/chat/ChatDisplay";

const ChatView = ({ conversationId }: { conversationId: string }) => {
  return <ChatDisplay />;
};
```

The `ChatDisplay` reads from atoms, so it doesn't need props.

- [ ] **Step 6: Verify no other ai-elements files import message.tsx or loader.tsx**

```bash
grep -r "from.*['\"].*message['\"]" frontend/components/ai-elements/ --include="*.tsx" --include="*.ts" -l
grep -r "from.*['\"].*loader['\"]" frontend/components/ai-elements/ --include="*.tsx" --include="*.ts" -l
```

If any other ai-elements files import these, update those imports first (or plan to delete those files too if they're no longer needed).

- [ ] **Step 7: Delete old message components**

```bash
rm frontend/components/ai-elements/message.tsx
rm frontend/components/ai-elements/loader.tsx
```

- [ ] **Step 7: Verify chat renders with messages**

Run: `cd frontend && bun run dev`

Send a message, verify turn-based rendering, empty state hint rotation, and processing indicator.

- [ ] **Step 8: Commit**

```bash
git add -u && git add frontend/components/chat/ frontend/hooks/ frontend/features/
git commit -m "feat: fork Craft chat display with turn grouping and empty state"
```

---

## Chunk 5: Input Area & Model Selector

### Task 5.1: Fork FreeFormInput

**Files:**
- Create: `frontend/components/input/FreeFormInput.tsx`
- Create: `frontend/components/input/InputContainer.tsx`
- Create: `frontend/components/input/ToolbarStatusSlot.tsx`
- Source: `.craft-source/apps/electron/src/renderer/components/app-shell/input/`

- [ ] **Step 1: Copy input component files**

```bash
mkdir -p frontend/components/input
cp .craft-source/apps/electron/src/renderer/components/app-shell/input/FreeFormInput.tsx frontend/components/input/
cp .craft-source/apps/electron/src/renderer/components/app-shell/input/InputContainer.tsx frontend/components/input/
cp .craft-source/apps/electron/src/renderer/components/app-shell/input/ChatInputZone.tsx frontend/components/input/
cp .craft-source/apps/electron/src/renderer/components/app-shell/input/ToolbarStatusSlot.tsx frontend/components/input/
cp .craft-source/apps/electron/src/renderer/components/app-shell/input/useAutoGrow.ts frontend/components/input/
cp .craft-source/apps/electron/src/renderer/components/app-shell/input/focus-input-events.ts frontend/components/input/
```

- [ ] **Step 2: Copy RichTextInput from ui package**

```bash
cp .craft-source/apps/electron/src/renderer/components/ui/rich-text-input.tsx frontend/components/craft-ui/components/ui/
```

(May already exist from Chunk 0 Task 0.5)

- [ ] **Step 3: Fix imports in all copied files**

Key rewiring for FreeFormInput:
- `window.electronAPI.openFileDialog()` → `@/lib/electron-shim` (shimmed to no-op, or implement a web file dialog: `input type="file"`)
- `window.electronAPI.getHomeDir()` → shim returns null
- Connection/model selection → rewire to our `modelsAtom` and `selectedModelIdAtom`
- Submit handler → wire to a callback prop that ChatContainer provides

For the file dialog specifically, since the shim returns empty, add a web fallback:
```typescript
// In FreeFormInput, replace electronAPI.openFileDialog with:
const openFileDialog = async () => {
  return new Promise<string[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      resolve(Array.from(input.files ?? []).map((f) => URL.createObjectURL(f)));
    };
    input.click();
  });
};
```

- [ ] **Step 4: Wire submit to our chat API**

In the ChatDisplay or ChatInputZone, find where the input submit triggers a session command. Replace with a callback that calls our streaming logic from `ChatContainer`.

- [ ] **Step 5: Verify no other files import from deleted components**

Before deleting, check for consumers:
```bash
grep -r "input-group" frontend/ --include="*.tsx" --include="*.ts" -l
grep -r "prompt-input" frontend/ --include="*.tsx" --include="*.ts" -l
grep -r "model-selector" frontend/ --include="*.tsx" --include="*.ts" -l
```

Known dependency: `frontend/components/ui/command.tsx` imports `InputGroup` and `InputGroupAddon` from `input-group.tsx`. Update `command.tsx` to remove that dependency (inline the needed styles or use Craft's equivalent) before deleting.

- [ ] **Step 6: Delete old input components**

```bash
rm frontend/components/ai-elements/prompt-input.tsx
rm frontend/components/ai-elements/model-selector.tsx
rm frontend/components/ui/input-group.tsx
```

- [ ] **Step 6: Verify input works**

Run: `cd frontend && bun run dev`

Type a message, submit, verify streaming works, model selector shows.

- [ ] **Step 7: Commit**

```bash
git add -u && git add frontend/components/input/
git commit -m "feat: fork Craft FreeFormInput with model selector"
```

---

## Chunk 6: shadcn/ui Components & Polish

### Task 6.1: Fork Craft's UI primitives

**Files:**
- Modify: `frontend/components/ui/*.tsx` (restyle or replace each)
- Source: `.craft-source/apps/electron/src/renderer/components/ui/`

- [ ] **Step 1: Identify which Craft ui/ components we need**

Compare `.craft-source/apps/electron/src/renderer/components/ui/` with `frontend/components/ui/`. For each of our existing components, check if Craft has an equivalent:

```bash
ls .craft-source/apps/electron/src/renderer/components/ui/ | sort > /tmp/craft-ui.txt
ls frontend/components/ui/ | sort > /tmp/our-ui.txt
comm -12 /tmp/craft-ui.txt /tmp/our-ui.txt
```

- [ ] **Step 2: Replace matching components carefully**

For each component that exists in both projects, check API compatibility before replacing:

```bash
# Compare exports: do they expose the same names?
grep "^export" frontend/components/ui/button.tsx | head -20
grep "^export" .craft-source/apps/electron/src/renderer/components/ui/button.tsx | head -20
```

**Safe to wholesale replace** (similar Radix + CVA patterns): `badge.tsx`, `separator.tsx`, `scroll-area.tsx`, `label.tsx`, `skeleton.tsx`, `progress.tsx`

**Replace carefully** (check variant names and prop interfaces match): `button.tsx`, `dialog.tsx`, `select.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`

For "replace carefully" components: after copying, grep for consumers and verify they still compile:
```bash
# e.g. after replacing button.tsx:
cd frontend && bun run typecheck 2>&1 | grep "button" | head -20
```

Fix any prop mismatches (add missing variants, alias renamed exports).

- [ ] **Step 3: Add new Craft-only components we need**

Copy any Craft ui/ components that our forked shell/chat/input components import but we don't have yet:

```bash
# e.g. entity-row, entity-list, entity-icon, etc.
cp .craft-source/apps/electron/src/renderer/components/ui/entity-row.tsx frontend/components/ui/
cp .craft-source/apps/electron/src/renderer/components/ui/entity-list.tsx frontend/components/ui/
cp .craft-source/apps/electron/src/renderer/components/ui/entity-icon.tsx frontend/components/ui/
# ... etc based on import errors
```

- [ ] **Step 4: Verify typecheck passes**

Run: `cd frontend && bun run typecheck`

Fix all remaining type errors from import mismatches.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/ui/
git commit -m "feat: fork Craft UI primitives"
```

### Task 6.2: Restyle auth pages

**Files:**
- Modify: `frontend/app/(auth)/login/page.tsx`
- Modify: `frontend/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Update auth pages to use new design tokens**

Review login and signup pages. Update Tailwind classes to use the new Craft token system (colors, shadows, spacing). Keep the form logic and auth flow intact.

- [ ] **Step 2: Verify auth flow works**

Run: `cd frontend && bun run dev`

Test login and signup flows end-to-end.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\(auth\)/
git commit -m "style: restyle auth pages with Craft design tokens"
```

### Task 6.3: Clean up old hooks and ai-elements

**Files:**
- Delete: unused hooks in `frontend/hooks/` and `frontend/features/chat/hooks/`
- Delete: unused `frontend/components/ai-elements/` files

- [ ] **Step 1: Identify unused hooks**

```bash
# For each old hook, check if anything still imports it:
for f in get-conversations get-conversation use-chat use-create-conversation use-generate-conversation-title use-models; do
  echo "=== $f ==="
  grep -r "$f" frontend/ --include="*.tsx" --include="*.ts" -l || echo "  UNUSED"
done
```

Delete any hook files that are no longer imported.

- [ ] **Step 2: Inventory remaining ai-elements files**

```bash
ls frontend/components/ai-elements/
```

For each remaining file, check if it's imported anywhere:
```bash
for f in frontend/components/ai-elements/*.tsx; do
  name=$(basename "$f" .tsx)
  refs=$(grep -r "$name" frontend/ --include="*.tsx" --include="*.ts" -l | grep -v "ai-elements/" | wc -l)
  echo "$name: $refs references"
done
```

Delete files with 0 external references.

- [ ] **Step 3: Remove `use-stick-to-bottom` dependency if no longer used**

```bash
grep -r "stick-to-bottom" frontend/ --include="*.tsx" --include="*.ts" -l
```

If no references remain, uninstall: `cd frontend && bun remove use-stick-to-bottom`

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: clean up old hooks and unused ai-elements"
```

### Task 6.4: Final consistency pass

- [ ] **Step 1: Full app walkthrough**

Run the app and navigate through every view:
1. Login page
2. Empty state (no conversations)
3. New conversation → send message → verify streaming
4. Sidebar: verify conversations list, date grouping, search
5. Switch between conversations
6. Light/dark mode toggle (if available)

- [ ] **Step 2: Fix any visual inconsistencies found**

Address any mismatched colors, broken layouts, missing animations, or unstyled components discovered during the walkthrough.

- [ ] **Step 3: Clean up unused files**

Remove any old component files that are no longer imported anywhere:

```bash
# Check for unreferenced ai-elements files
grep -r "ai-elements" frontend/ --include="*.tsx" --include="*.ts" -l
```

Delete any `ai-elements/` files that are no longer imported.

- [ ] **Step 4: Final typecheck and lint**

```bash
cd frontend && bun run typecheck && bun run lint
```

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "polish: final consistency pass for Craft UI reskin"
```
