# Vite + TanStack Router Migration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Next.js with Vite + TanStack Router so the frontend is a single SPA codebase that works in both browser (served by CDN/FastAPI) and Electron (loaded via `file://`).

**Architecture:** The frontend becomes a Vite-built React SPA with TanStack Router for routing and TanStack Query (already in use) for data fetching. Auth protection moves from server-side middleware to a client-side route guard. The backend (FastAPI) stays unchanged. The build output is a static `dist/` folder deployable anywhere.

**Tech Stack:** Vite 6.2.4, @tanstack/react-router, @tanstack/react-query (already installed), React 19.2.4, TailwindCSS 4.x, Biome

---

## Scope Check

This is a single subsystem migration (frontend build + routing). The backend is untouched. The plan produces a working, testable SPA at every stage — each stage can be merged independently.

**Total routes:** 6 (root, conversation, login, signup, dashboard, dev/access-requests)
**Server components to convert:** 2 (root page UUID gen, ConversationPage message fetch)
**Files with Next.js router imports:** 7

---

## Current State Inventory

| Next.js Feature | Where Used | Replacement |
|---|---|---|
| `useRouter().push/replace` | 7 files | `useNavigate()` from TanStack Router |
| `usePathname()` | `conversation-sidebar-item.tsx` | `useLocation().pathname` from TanStack Router |
| `cookies()` + server fetch | `c/[conversationId]/page.tsx` | `useAuthedQuery()` (already used for sidebar) |
| `crypto.randomUUID()` server-side | `(app)/page.tsx` | `crypto.randomUUID()` client-side (same API, works in browsers) |
| `notFound()`/`unauthorized()` | `c/[conversationId]/page.tsx` | Client-side redirect in query error handler |
| Route groups `(app)`/`(auth)` | `app/` directory | TanStack Router layout routes |
| `proxy.ts` middleware | Auth redirect | `beforeLoad` guard on protected routes |
| `NEXT_PUBLIC_API_URL` env var | `lib/api.ts` | `import.meta.env.VITE_API_URL` |
| `next/script` | `layout.tsx` (dev only) | Regular `<script>` in `index.html` |
| Metadata export | `layout.tsx` | `<title>` in `index.html` |

---

## File Structure

### Files to CREATE

```
frontend/
  index.html                          # Vite entry HTML (replaces app/layout.tsx)
  vite.config.ts                      # Vite build config
  src/
    main.tsx                          # React root + RouterProvider + QueryClientProvider
    router.tsx                        # TanStack Router: route tree, auth guard, layouts
    routes/
      root-page.tsx                   # "/" — new conversation (was app/(app)/page.tsx)
      conversation-page.tsx           # "/c/$conversationId" — existing conversation
      login-page.tsx                  # "/login" (was app/(auth)/login/page.tsx)
      signup-page.tsx                 # "/signup" (was app/(auth)/signup/page.tsx)
      dashboard-page.tsx              # "/dashboard" (was app/(app)/dashboard/page.tsx)
      dev-access-requests-page.tsx    # "/dev/access-requests" (was app/dev/access-requests/page.tsx)
    layouts/
      app-layout.tsx                  # Sidebar wrapper (was app/(app)/layout.tsx)
      auth-layout.tsx                 # Centered card layout (was inline in login/signup pages)
```

### Files to MODIFY

```
frontend/package.json                 # Remove next, add vite + @tanstack/react-router + @vitejs/plugin-react
frontend/tsconfig.json                # Remove next plugin, update for Vite
frontend/lib/api.ts                   # NEXT_PUBLIC_API_URL → import.meta.env.VITE_API_URL
frontend/hooks/use-authed-fetch.ts    # useRouter() → useNavigate()
frontend/hooks/use-app-router.ts      # Rewrite to use TanStack Router
frontend/components/new-sidebar.tsx    # useRouter() → useNavigate()
frontend/components/conversation-sidebar-item.tsx  # useRouter/usePathname → TanStack
frontend/components/nav-chats.tsx      # useRouter() → useNavigate()
frontend/components/login-form.tsx     # useRouter() → useNavigate()
frontend/components/signup-form.tsx    # useRouter() → useNavigate()
frontend/features/chat/ChatContainer.tsx  # useRouter() → useNavigate()
```

### Files to DELETE

```
frontend/app/                         # Entire Next.js app directory
frontend/next.config.ts               # Next.js config
frontend/next-env.d.ts                # Next.js type declarations
frontend/proxy.ts                     # Next.js middleware (replaced by route guard)
frontend/app/get-query-client.ts      # SSR query client logic (simplified)
frontend/.next/                       # Next.js build cache
```

### Files UNCHANGED

```
frontend/components/ui/               # All UI components
frontend/components/ai-elements/      # All AI chat elements
frontend/components/icons/            # Icon components
frontend/features/chat/hooks/         # Chat hooks (use-chat.ts, etc.)
frontend/features/chat/ChatView.tsx   # Chat view
frontend/hooks/get-conversations.ts   # Conversation list query
frontend/hooks/use-authed-query.ts    # Auth query wrapper (useRouter swap only)
frontend/lib/types.ts                 # Type definitions
frontend/lib/utils.ts                 # Utility functions
frontend/app/globals.css              # Moved to frontend/src/index.css (copy, not change)
backend/                              # Zero backend changes
```

---

## Stage 1: Vite Build Setup

### Task 1: Install dependencies and create Vite config

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`

- [ ] **Step 1: Update package.json**

Remove `next` from dependencies. Add new deps:
```bash
cd frontend
bun remove next
bun add @tanstack/react-router
bun add -d vite @vitejs/plugin-react @tailwindcss/vite
```

Update scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "bunx --bun @biomejs/biome lint --write",
    "format": "bunx --bun @biomejs/biome format --write",
    "fix": "bunx --bun @biomejs/biome check --write"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

Reference: Craft's `apps/webui/vite.config.ts` for Tailwind + React plugin setup.

```typescript
// frontend/vite.config.ts
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: ".",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/": path.resolve(__dirname) + "/",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 3001,
  },
});
```

- [ ] **Step 3: Create index.html**

This replaces `app/layout.tsx` as the entry point.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pawrrtal</title>
  <meta name="description" content="An AI chat application" />
  <script>
    // System theme detection — before paint to prevent FOUC
    (function(){try{var d=document.documentElement;if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(e){e.matches?d.classList.add('dark'):d.classList.remove('dark')})}catch(e){}})()
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/vite.config.ts frontend/index.html
git commit -m "feat: add Vite build config, replace Next.js"
```

---

### Task 2: Update tsconfig.json for Vite

**Files:**
- Modify: `frontend/tsconfig.json`

- [ ] **Step 1: Update tsconfig**

Remove Next.js plugin, update module settings for Vite:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "verbatimModuleSyntax": true,
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "noEmit": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    },
    "esModuleInterop": true,
    "types": ["vite/client"]
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "**/*.mts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

Key changes: removed `incremental`, `next` plugin, `.next/types` includes. Added `vite/client` types.

- [ ] **Step 2: Update lib/api.ts env var**

Change `NEXT_PUBLIC_API_URL` to Vite's env convention:

```typescript
// frontend/lib/api.ts line 5-6
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";
```

Also create `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

- [ ] **Step 3: Verify** — `cd frontend && bunx --bun tsc --noEmit` (will have errors from missing src/main.tsx — that's expected at this point)

- [ ] **Step 4: Commit**

```bash
git add frontend/tsconfig.json frontend/lib/api.ts frontend/.env
git commit -m "feat: update tsconfig and env vars for Vite"
```

---

## Stage 2: TanStack Router + Route Definitions

### Task 3: Create the router and route tree

**Files:**
- Create: `frontend/src/router.tsx`
- Create: `frontend/src/layouts/app-layout.tsx`
- Create: `frontend/src/layouts/auth-layout.tsx`

- [ ] **Step 1: Create app-layout.tsx**

This wraps the sidebar around child routes (replaces `app/(app)/layout.tsx`):

```tsx
// frontend/src/layouts/app-layout.tsx
import { Outlet } from "@tanstack/react-router";
import { NewSidebar } from "@/components/new-sidebar";

export function AppLayout() {
  return <NewSidebar><Outlet /></NewSidebar>;
}
```

- [ ] **Step 2: Create auth-layout.tsx**

Centered layout for login/signup pages:

```tsx
// frontend/src/layouts/auth-layout.tsx
import { Outlet } from "@tanstack/react-router";

export function AuthLayout() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create router.tsx**

This is the core routing file. Uses code-based routing (6 routes don't need file-based).

```tsx
// frontend/src/router.tsx
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { AppLayout } from "./layouts/app-layout";
import { AuthLayout } from "./layouts/auth-layout";

// Root route — provides QueryClient context to all routes
const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Outlet,
});

// Auth guard — checks for session_token cookie
function hasSessionToken(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("session_token="));
}

// ── App routes (sidebar layout, auth-protected) ──────────────

const appLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
  beforeLoad: () => {
    if (!hasSessionToken()) {
      throw redirect({ to: "/login" });
    }
  },
});

const indexRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/",
  component: () => {
    // Lazy import to match current code-splitting
    const { default: RootPage } = require("./routes/root-page");
    return <RootPage />;
  },
});

const conversationRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/c/$conversationId",
  component: () => {
    const { default: ConversationPage } = require("./routes/conversation-page");
    return <ConversationPage />;
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/dashboard",
  component: () => {
    const { default: DashboardPage } = require("./routes/dashboard-page");
    return <DashboardPage />;
  },
});

// ── Auth routes (centered layout, public) ────────────────────

const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth",
  component: AuthLayout,
});

const loginRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/login",
  component: () => {
    const { default: LoginPage } = require("./routes/login-page");
    return <LoginPage />;
  },
});

const signupRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "/signup",
  component: () => {
    const { default: SignupPage } = require("./routes/signup-page");
    return <SignupPage />;
  },
});

// ── Dev routes (no layout, public) ───────────────────────────

const devAccessRequestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dev/access-requests",
  component: () => {
    const { default: DevPage } = require("./routes/dev-access-requests-page");
    return <DevPage />;
  },
});

// ── Route tree ───────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  appLayout.addChildren([
    indexRoute,
    conversationRoute,
    dashboardRoute,
  ]),
  authLayout.addChildren([
    loginRoute,
    signupRoute,
  ]),
  devAccessRequestsRoute,
]);

// ── Router instance ──────────────────────────────────────────

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
  });
}

// Type registration for useNavigate/useParams type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
```

**Note:** The `require()` calls above are placeholders — the actual implementation should use `lazy()` from TanStack Router for proper code-splitting. Adjust during implementation based on how TanStack Router handles lazy routes with the exact version installed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router.tsx frontend/src/layouts/
git commit -m "feat: add TanStack Router with route tree and auth guard"
```

---

### Task 4: Create route page components

Convert each Next.js page to a client component. These are thin wrappers.

**Files:**
- Create: `frontend/src/routes/root-page.tsx`
- Create: `frontend/src/routes/conversation-page.tsx`
- Create: `frontend/src/routes/login-page.tsx`
- Create: `frontend/src/routes/signup-page.tsx`
- Create: `frontend/src/routes/dashboard-page.tsx`
- Create: `frontend/src/routes/dev-access-requests-page.tsx`

- [ ] **Step 1: Create root-page.tsx**

Was a server component that generated a UUID. Now client-side (crypto.randomUUID() works in all browsers):

```tsx
// frontend/src/routes/root-page.tsx
import { useMemo } from "react";
import ChatContainer from "@/features/chat/ChatContainer";

export default function RootPage() {
  const uuid = useMemo(() => crypto.randomUUID(), []);
  return (
    <div>
      <ChatContainer key={uuid} conversationId={uuid} />
    </div>
  );
}
```

- [ ] **Step 2: Create conversation-page.tsx**

Was a server component that fetched messages with `cookies()`. Now uses `useAuthedQuery()` (same pattern as the sidebar conversation list):

```tsx
// frontend/src/routes/conversation-page.tsx
import { useParams } from "@tanstack/react-router";
import ChatContainer from "@/features/chat/ChatContainer";
import useAuthedQuery from "@/hooks/use-authed-query";
import { API_ENDPOINTS } from "@/lib/api";

export default function ConversationPage() {
  const { conversationId } = useParams({ from: "/c/$conversationId" });

  const { data: messages, isLoading } = useAuthedQuery<unknown[]>(
    ["conversation-messages", conversationId],
    API_ENDPOINTS.conversations.getMessages(conversationId),
  );

  if (isLoading) {
    return <div className="flex-1" />;
  }

  return (
    <div>
      <h1 className="flex-1 items-center text-center">
        Conversation {conversationId}
      </h1>
      <ChatContainer
        key={conversationId}
        conversationId={conversationId}
        initialChatHistory={messages ?? []}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create login-page.tsx**

Was a server component that read env vars for test user. In Vite, env vars with `VITE_` prefix are available client-side:

```tsx
// frontend/src/routes/login-page.tsx
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  const testUserEmail = import.meta.env.DEV
    ? import.meta.env.VITE_TEST_USER_EMAIL
    : undefined;
  const testUserPassword = import.meta.env.DEV
    ? import.meta.env.VITE_TEST_USER_PASSWORD
    : undefined;

  return (
    <LoginForm
      testUserEmail={testUserEmail}
      testUserPassword={testUserPassword}
    />
  );
}
```

- [ ] **Step 4: Create signup-page.tsx**

```tsx
// frontend/src/routes/signup-page.tsx
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return <SignupForm />;
}
```

- [ ] **Step 5: Create dashboard-page.tsx**

Copy the existing dashboard page content directly (it's already a client component with no Next.js deps):

```tsx
// frontend/src/routes/dashboard-page.tsx
// Copy the full content of frontend/app/(app)/dashboard/page.tsx
// Replace any next/navigation imports with TanStack Router equivalents
```

Read the actual file at `frontend/app/(app)/dashboard/page.tsx` and copy it, replacing imports as needed.

- [ ] **Step 6: Create dev-access-requests-page.tsx**

```tsx
// frontend/src/routes/dev-access-requests-page.tsx
// Copy from frontend/app/dev/access-requests/page.tsx — it's already "use client"
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes/
git commit -m "feat: create route page components for TanStack Router"
```

---

## Stage 3: Entry Point + Router Hook Migration

### Task 5: Create main.tsx entry point and copy CSS

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/index.css`

- [ ] **Step 1: Create src/index.css**

```css
@import "tailwindcss";
@source "../components/**/*.tsx";
@source "../features/**/*.tsx";
@source "./routes/**/*.tsx";
@source "./layouts/**/*.tsx";
@import "../app/globals.css";
```

This imports Tailwind and scans all component directories. The globals.css import brings in our theme variables, custom classes, etc.

- [ ] **Step 2: Create src/main.tsx**

```tsx
// frontend/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { createAppRouter } from "./router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 60 * 30 * 1000,
    },
  },
});

const router = createAppRouter(queryClient);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.tsx frontend/src/index.css
git commit -m "feat: add Vite entry point with TanStack Router + Query"
```

---

### Task 6: Migrate useRouter/usePathname in all components

Replace Next.js router imports with TanStack Router equivalents across all 7 files.

**Files to modify:**
- `frontend/hooks/use-authed-fetch.ts`
- `frontend/hooks/use-app-router.ts`
- `frontend/components/new-sidebar.tsx`
- `frontend/components/conversation-sidebar-item.tsx`
- `frontend/components/nav-chats.tsx`
- `frontend/components/login-form.tsx`
- `frontend/components/signup-form.tsx`
- `frontend/features/chat/ChatContainer.tsx`

- [ ] **Step 1: Rewrite use-app-router.ts**

Currently wraps `next/navigation`. Rewrite to wrap TanStack Router:

```tsx
// frontend/hooks/use-app-router.ts
"use client";

import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

export function useAppRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  const push = useCallback(
    (path: string) => {
      void navigate({ to: path });
    },
    [navigate],
  );

  const replace = useCallback(
    (path: string) => {
      void navigate({ to: path, replace: true });
    },
    [navigate],
  );

  return { push, replace, pathname: location.pathname };
}
```

- [ ] **Step 2: Update use-authed-fetch.ts**

Replace `useRouter` from `next/navigation` with `useNavigate` from TanStack Router:

```diff
- import { useRouter } from "next/navigation";
+ import { useNavigate } from "@tanstack/react-router";

// In the hook body:
- const router = useRouter();
+ const navigate = useNavigate();

// In the 401 handler:
- router.replace("/login");
+ void navigate({ to: "/login", replace: true });
```

- [ ] **Step 3: Update remaining 6 component files**

For each file that imports from `next/navigation`:
- If it already uses `useAppRouter()` (from Stage 1 of the earlier session): no change needed
- If it directly imports `useRouter`/`usePathname`: replace with `useAppRouter()` or direct TanStack Router imports

Specifically:
- `new-sidebar.tsx` — already uses `useAppRouter()` if Stage 1 was applied, otherwise swap `useRouter` → `useAppRouter`
- `conversation-sidebar-item.tsx` — already uses `useAppRouter()` or swap `usePathname` → `useLocation().pathname`
- `nav-chats.tsx` — swap `useRouter` → `useAppRouter`
- `login-form.tsx` — swap `useRouter` → `useAppRouter`
- `signup-form.tsx` — swap `useRouter` → `useAppRouter`
- `ChatContainer.tsx` — swap `useRouter` → `useAppRouter`

- [ ] **Step 4: Remove all "use client" directives**

Vite doesn't use the `"use client"` convention. These are harmless (just string literals) but should be removed for clarity. Do a bulk removal:

```bash
cd frontend
grep -rl '"use client"' components/ features/ hooks/ lib/ src/ | head -20
```

Remove `"use client";` from each file. (This can be done in a follow-up cleanup commit.)

- [ ] **Step 5: Verify** — `cd frontend && bunx --bun tsc --noEmit`

- [ ] **Step 6: Verify** — `cd frontend && bunx vite build` (should produce `dist/` with working SPA)

- [ ] **Step 7: Commit**

```bash
git add frontend/hooks/ frontend/components/ frontend/features/
git commit -m "refactor: migrate all components from next/navigation to TanStack Router"
```

---

## Stage 4: Cleanup + Dev Workflow

### Task 7: Delete Next.js files and update dev scripts

**Files:**
- Delete: `frontend/app/` (entire directory)
- Delete: `frontend/next.config.ts`
- Delete: `frontend/next-env.d.ts`
- Delete: `frontend/proxy.ts`
- Delete: `frontend/.next/` (build cache)
- Modify: `dev.ts` (root orchestrator)
- Modify: `Justfile`

- [ ] **Step 1: Delete Next.js files**

```bash
rm -rf frontend/app/ frontend/next.config.ts frontend/next-env.d.ts frontend/proxy.ts frontend/.next/
```

**Exception:** Keep `frontend/app/globals.css` — it's now imported by `src/index.css`. Move it:
```bash
mkdir -p frontend/styles
mv frontend/app/globals.css frontend/styles/globals.css
```
Then update `frontend/src/index.css` to import from `../styles/globals.css`.

- [ ] **Step 2: Update dev.ts**

Currently starts Next.js on port 3001 and FastAPI on 8000. Update the frontend command:

```diff
- spawn("bun", ["--cwd", "frontend", "dev"])  // was: next dev
+ spawn("bun", ["--cwd", "frontend", "run", "dev"])  // now: vite dev (port 3001 from vite.config.ts)
```

The `portless` integration for the frontend may need updating — check if it still works with Vite's dev server.

- [ ] **Step 3: Update Justfile**

```diff
- dev: "bun run dev"  # currently starts both servers
+ dev: "bun run dev"  # same command, dev.ts handles both
```

If `portless` doesn't work with Vite, simplify to direct port binding (Vite on 3001, FastAPI on 8000).

- [ ] **Step 4: Update backend CORS**

In `backend/.env`, ensure `http://localhost:3001` is in CORS_ORIGINS (for Vite dev server). It likely already is.

- [ ] **Step 5: Verify full dev workflow**

```bash
just dev
# Should start Vite on :3001 and FastAPI on :8000
# Open http://localhost:3001 — should see login page
# Login → sidebar + chat should work
# Navigate to existing conversation → messages load via useAuthedQuery
```

- [ ] **Step 6: Verify production build**

```bash
cd frontend && bun run build
# Should produce frontend/dist/ with index.html + assets
# Serve with: bunx serve dist
# Open in browser — full app should work
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove Next.js, update dev workflow for Vite"
```

---

## Stage 5: Electron Shell (Optional — can be separate PR)

This stage adds Electron as a second entry point to the same codebase. Follows the plan in `docs/superpowers/plans/2026-03-26-electron-desktop-app.md` (Tasks 5-11), but now simplified because the renderer is already a Vite SPA.

The Electron app:
- Loads `http://localhost:5173` in dev (Vite dev server)
- Loads `file://dist/index.html` in production (Vite build output)
- Spawns FastAPI as a sidecar process
- Preload exposes `electronAPI` via contextBridge

This is documented in the separate Electron plan and can be implemented after the Vite migration lands.

---

## Verification Checklist

After all stages:

- [ ] `cd frontend && bun run build` produces `dist/` with index.html
- [ ] `cd frontend && bun run dev` starts Vite on port 3001
- [ ] Login page renders at `/login`
- [ ] Login → redirects to `/` with sidebar
- [ ] New conversation works (UUID generated, chat streams)
- [ ] Existing conversation loads messages (`/c/:id`)
- [ ] Sidebar shows conversations, search works, right-click menu works
- [ ] Dark mode toggles with system preference
- [ ] `bun run typecheck` passes
- [ ] `bun run fix` (Biome) passes
- [ ] `grep -r "next/navigation\|next/headers\|next/server\|next/script" frontend/` returns zero matches
- [ ] `grep -r "NEXT_PUBLIC_" frontend/` returns zero matches
