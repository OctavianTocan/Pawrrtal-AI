# AI Nexus Electron Desktop App — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship AI Nexus as an Electron desktop app that shares renderer code with the existing web app, following Craft's proven dual-platform architecture (`apps/electron/` + `apps/webui/`).

**Architecture:** Shared Vite-bundled renderer with platform adapters. The web app connects to FastAPI via HTTP+SSE (current behavior). The Electron app spawns FastAPI as a sidecar and loads the same renderer via `file://` (prod) or `localhost:5173` (dev). Both platforms set `window.electronAPI` through different mechanisms — Electron via contextBridge preload, web via an HTTP adapter. Components never import Electron directly.

**Tech Stack:** Electron 39.2.7, Vite 6.2.4, esbuild 0.25.0, electron-builder 26.0.12, React 19.2.4, react-router 7.x, TailwindCSS 4.x

**Key Reference:** Craft's `apps/webui/` (added in commit `4d1dcc6`) proves this pattern works — their web UI reuses the Electron renderer via Vite aliases + API adapter + Node.js shims.

---

## Scope

This plan covers 4 stages, each producing shippable software:

| Stage | Deliverable | Effort |
|---|---|---|
| **1. Router abstraction** | Replace `next/navigation` hooks with a shared router abstraction that works in both Next.js and react-router | 1 day |
| **2. API adapter layer** | Create `electronAPI` adapter for web (wraps our HTTP fetch) + shim infrastructure | 1-2 days |
| **3. Vite renderer** | Bundle the shared renderer with Vite for use outside Next.js | 1-2 days |
| **4. Electron shell** | Main process, preload, build scripts, electron-builder config, FastAPI sidecar | 2-3 days |

**Each stage can be merged independently.** Stage 1-2 improve the web app's architecture even without Electron.

---

## Evidence: Why This Architecture

### Craft's `apps/webui/` pattern (commit `4d1dcc6`)

Craft ships two apps from the same renderer:
- `apps/electron/` — Desktop (Electron preload sets `window.electronAPI` via IPC)
- `apps/webui/` — Browser (web adapter sets `window.electronAPI` via HTTP/WebSocket)

Key files:
- `apps/webui/vite.config.ts` — aliases `@/` to `../electron/src/renderer/` (shared components)
- `apps/webui/src/adapter/web-api.ts` — creates `window.electronAPI` using WsRpcClient
- `apps/webui/src/shims/` — stubs Node.js builtins so bundler accepts Electron renderer imports
- `apps/webui/src/App.tsx` — bootstraps adapter, then lazy-loads Electron's App component

### AI Nexus adaptation

We follow the same pattern but adapted for our stack:
- Our "Electron renderer" equivalent is `frontend/components/` + `frontend/features/`
- Our web adapter wraps `useAuthedFetch()` HTTP calls (not WsRPC)
- Our Electron preload exposes the same API surface but through IPC

### What we DON'T need from Craft
- WsRPC transport — our HTTP+SSE works fine
- Multi-workspace — single workspace is sufficient
- Session file management — our backend handles persistence
- Multi-window — single window
- Auto-updater — deferred
- Deep links — deferred

---

## File Structure

### New files to create

```
apps/electron/
  package.json                    # Electron + esbuild + electron-builder deps
  tsconfig.json                   # Node target for main process
  electron-builder.yml            # Packaging config (adapted from Craft)
  vite.config.ts                  # Renderer bundling (aliases to frontend/)
  dev.ts                          # Dev workflow orchestrator
  resources/
    icon.icns                     # macOS icon (placeholder)
    icon.ico                      # Windows icon (placeholder)
    icon.png                      # Linux icon (placeholder)
  src/
    main/
      index.ts                    # App lifecycle, window creation, FastAPI sidecar
      sidecar.ts                  # FastAPI process management (spawn, health check, shutdown)
    preload/
      index.ts                    # contextBridge with electronAPI
    renderer/
      index.html                  # Vite entry HTML
      main.tsx                    # React root (sets up router, loads App)
      App.tsx                     # Root component (parallel to Craft's webui App.tsx)
      index.css                   # Tailwind imports + shared styles
    shims/                        # Node.js builtin stubs (copied from Craft webui pattern)
      node-builtins.ts
      electron-log.ts

frontend/
  lib/
    router.ts                     # NEW: shared router abstraction
    electron-api.ts               # NEW: web adapter (wraps HTTP fetch as electronAPI)
  hooks/
    use-app-router.ts             # NEW: platform-agnostic router hook
```

### Files to modify

```
frontend/components/new-sidebar.tsx        # useRouter() -> useAppRouter()
frontend/components/conversation-sidebar-item.tsx  # useRouter(), usePathname() -> useAppRouter()
frontend/components/nav-chats.tsx          # useRouter() -> useAppRouter()
frontend/components/login-form.tsx         # useRouter() -> useAppRouter()
frontend/app/(app)/c/[conversationId]/page.tsx  # Convert server component to client
package.json                               # Add apps/electron to workspaces
Justfile                                   # Add electron:dev recipe
```

### Files that do NOT change
```
backend/                          # Zero backend changes (except .env for localhost cookie domain)
frontend/components/ui/           # All UI components unchanged
frontend/features/chat/           # Chat logic unchanged (SSE streaming works in Electron Chromium)
frontend/hooks/use-authed-fetch.ts  # HTTP fetch unchanged
frontend/hooks/use-authed-query.ts  # React Query unchanged
frontend/hooks/get-conversations.ts # Unchanged
frontend/app/globals.css          # Unchanged
```

---

## Stage 1: Router Abstraction

### Task 1: Create shared router hook

Currently, 4 components import `useRouter` and/or `usePathname` from `next/navigation`. These won't work outside Next.js. Create a platform-agnostic wrapper.

**Files:**
- Create: `frontend/hooks/use-app-router.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/hooks/use-app-router.ts
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Platform-agnostic router hook.
 *
 * In Next.js: delegates to next/navigation.
 * When replaced by Vite build: delegates to react-router.
 *
 * Components should import this instead of next/navigation directly.
 */
export function useAppRouter() {
  const router = useRouter();
  const pathname = usePathname();

  const push = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const replace = useCallback(
    (path: string) => {
      router.replace(path);
    },
    [router],
  );

  return { push, replace, pathname };
}
```

- [ ] **Step 2: Verify** — `cd frontend && bunx --bun tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/use-app-router.ts
git commit -m "feat: add platform-agnostic useAppRouter hook"
```

---

### Task 2: Migrate components to useAppRouter

Replace all `next/navigation` imports in shared components with `useAppRouter`.

**Files to modify:**
- `frontend/components/new-sidebar.tsx` — `useRouter()` on line 3
- `frontend/components/conversation-sidebar-item.tsx` — `useRouter()`, `usePathname()` on line 4
- `frontend/components/nav-chats.tsx` — `useRouter()` on line 4
- `frontend/components/login-form.tsx` — `useRouter()` (check exact line)

- [ ] **Step 1: Update new-sidebar.tsx**

Replace:
```typescript
import { useRouter } from "next/navigation";
```
With:
```typescript
import { useAppRouter } from "@/hooks/use-app-router";
```
And `useRouter()` call → `useAppRouter()`. Only `.push()` is used, so it's a direct swap.

- [ ] **Step 2: Update conversation-sidebar-item.tsx**

Replace:
```typescript
import { usePathname, useRouter } from "next/navigation";
```
With:
```typescript
import { useAppRouter } from "@/hooks/use-app-router";
```
Replace `useRouter()` + `usePathname()` with single `const { push, pathname } = useAppRouter()`.

- [ ] **Step 3: Update nav-chats.tsx**

Same pattern — replace `useRouter()` with `useAppRouter()`.

- [ ] **Step 4: Update login-form.tsx**

Same pattern. Check if it uses `router.replace()` (for redirect after login) — the hook supports both `push` and `replace`.

- [ ] **Step 5: Verify** — `cd frontend && bunx --bun tsc --noEmit`

- [ ] **Step 6: Grep for remaining next/navigation imports in components/**

```bash
grep -r "from.*next/navigation" frontend/components/ --include="*.tsx"
```

Expected: zero matches (only `app/` pages should still import next/navigation directly).

- [ ] **Step 7: Commit**

```bash
git add frontend/components/ frontend/hooks/use-app-router.ts
git commit -m "refactor: migrate shared components from next/navigation to useAppRouter"
```

---

## Stage 2: API Adapter Layer

### Task 3: Define the ElectronAPI type interface

Create a TypeScript interface for the API surface that both web and Electron adapters will implement. Start minimal — only what our components currently need.

**Files:**
- Create: `frontend/lib/electron-api-types.ts`

- [ ] **Step 1: Audit current electronAPI usage**

Search for what our components actually call on `window.electronAPI` or could benefit from:
```bash
grep -r "electronAPI\|window\.open\|navigator\.clipboard\|router\.push" frontend/components/ --include="*.tsx" -l
```

Based on the current codebase, the minimal API surface is:
- `openUrl(url: string)` — open external URL
- `openInNewWindow(url: string)` — open in new tab/window
- `copyToClipboard(text: string)` — copy text
- `getSystemTheme()` — returns 'dark' | 'light'
- `onSystemThemeChange(cb)` — listen for theme changes
- `platform` — 'darwin' | 'win32' | 'linux' | 'web'

- [ ] **Step 2: Create the type file**

```typescript
// frontend/lib/electron-api-types.ts
export interface ElectronAPI {
  platform: "darwin" | "win32" | "linux" | "web";
  openUrl: (url: string) => void;
  openInNewWindow: (url: string) => void;
  copyToClipboard: (text: string) => Promise<void>;
  getSystemTheme: () => "dark" | "light";
  onSystemThemeChange: (callback: (theme: "dark" | "light") => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
```

- [ ] **Step 3: Verify** — `tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/electron-api-types.ts
git commit -m "feat: define ElectronAPI type interface for platform adapters"
```

---

### Task 4: Create web API adapter

This is the web equivalent of Craft's `apps/webui/src/adapter/web-api.ts`. It wraps browser APIs into the `ElectronAPI` interface so components can use a uniform API.

**Files:**
- Create: `frontend/lib/electron-api-web.ts`

- [ ] **Step 1: Create the web adapter**

```typescript
// frontend/lib/electron-api-web.ts
import type { ElectronAPI } from "./electron-api-types";

export function createWebElectronAPI(): ElectronAPI {
  return {
    platform: "web",

    openUrl: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },

    openInNewWindow: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },

    copyToClipboard: async (text: string) => {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    },

    getSystemTheme: () => {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    },

    onSystemThemeChange: (callback) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        callback(e.matches ? "dark" : "light");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    },
  };
}
```

- [ ] **Step 2: Initialize in providers**

In `frontend/app/providers.tsx`, set `window.electronAPI` if not already set (Electron preload sets it first):

```typescript
import { createWebElectronAPI } from "@/lib/electron-api-web";

// Set web adapter if not in Electron
if (typeof window !== "undefined" && !window.electronAPI) {
  window.electronAPI = createWebElectronAPI();
}
```

- [ ] **Step 3: Verify** — `tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/electron-api-web.ts frontend/lib/electron-api-types.ts frontend/app/providers.tsx
git commit -m "feat: add web ElectronAPI adapter matching Craft webui pattern"
```

---

## Stage 3: Vite Renderer (Electron entry)

### Task 5: Create `apps/electron/` workspace

**Files:**
- Create: `apps/electron/package.json`
- Create: `apps/electron/tsconfig.json`
- Modify: `package.json` (root) — add workspace

- [ ] **Step 1: Create package.json**

Model after Craft's `apps/electron/package.json` but minimal:

```json
{
  "name": "ai-nexus-electron",
  "version": "0.1.0",
  "private": true,
  "main": "dist/main.cjs",
  "scripts": {
    "dev": "bun run ./dev.ts",
    "build:main": "esbuild src/main/index.ts --bundle --platform=node --format=cjs --outfile=dist/main.cjs --external:electron",
    "build:preload": "esbuild src/preload/index.ts --bundle --platform=node --format=cjs --outfile=dist/preload.cjs --external:electron",
    "build:renderer": "vite build",
    "build": "bun run build:main && bun run build:preload && bun run build:renderer",
    "dist": "electron-builder",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "electron-log": "^5.4.3"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.18",
    "@vitejs/plugin-react": "^5.1.2",
    "electron": "39.2.7",
    "electron-builder": "^26.0.12",
    "esbuild": "^0.25.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router": "^7.6.1",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.9.3",
    "vite": "^6.2.4"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["../../frontend/*"],
      "@electron/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Add workspace to root package.json**

Add `"apps/electron"` to the `workspaces` array.

- [ ] **Step 4: Verify** — `bun install` from root

- [ ] **Step 5: Commit**

```bash
git add apps/electron/package.json apps/electron/tsconfig.json package.json
git commit -m "feat: create apps/electron workspace"
```

---

### Task 6: Create Vite config for renderer

Model after Craft's `apps/webui/vite.config.ts` — aliases point at `frontend/` for shared components.

**Files:**
- Create: `apps/electron/vite.config.ts`

- [ ] **Step 1: Create vite.config.ts**

```typescript
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: "src/renderer",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Shared components from frontend/
      "@/": path.resolve(__dirname, "../../frontend") + "/",
      // Electron-specific code
      "@electron/": path.resolve(__dirname, "src") + "/",
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
  },
});
```

- [ ] **Step 2: Create renderer entry HTML**

`apps/electron/src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Nexus</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 3: Create renderer main.tsx**

```typescript
// apps/electron/src/renderer/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Create renderer index.css**

```css
@import "tailwindcss";
@source "../../../../frontend/components/**/*.tsx";
@source "../../../../frontend/features/**/*.tsx";
@import "../../../../frontend/app/globals.css";
```

- [ ] **Step 5: Create renderer App.tsx**

Modeled after Craft's `apps/webui/src/App.tsx`:

```typescript
// apps/electron/src/renderer/App.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Lazy-load pages from shared frontend
const ChatPage = lazy(() => import("@/features/chat/ChatContainer"));
const LoginPage = lazy(() => import("@/components/login-form"));

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="flex-1" />}>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/c/:conversationId" element={<ChatPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

Note: The exact imports depend on how components are exported. This will need adjustment during implementation — check actual exports.

- [ ] **Step 6: Verify** — `cd apps/electron && bunx vite build` (expect shim errors — addressed in next task)

- [ ] **Step 7: Commit**

```bash
git add apps/electron/vite.config.ts apps/electron/src/renderer/
git commit -m "feat: add Vite renderer config and entry points for Electron"
```

---

### Task 7: Create Node.js shims

Copy Craft's `apps/webui/src/shims/` pattern — stub Node.js builtins so Vite can bundle shared code that transitively imports Node modules.

**Files:**
- Create: `apps/electron/src/shims/node-builtins.ts`
- Create: `apps/electron/src/shims/electron-log.ts`

- [ ] **Step 1: Create node-builtins.ts**

Reference: `/Volumes/Crucial X10/Projects/craft-agents-oss/apps/webui/src/shims/node-builtins.ts`

Read Craft's file and copy it. It stubs: fs, path, child_process, os, crypto, http, https, net, tls, util, buffer, stream, process, EventEmitter.

For AI Nexus, we likely need fewer shims since our components don't import Node modules directly. Create a minimal version and expand as Vite build errors surface.

- [ ] **Step 2: Create electron-log.ts**

```typescript
// apps/electron/src/shims/electron-log.ts
export default {
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  scope: () => ({
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  }),
};
```

- [ ] **Step 3: Add shim aliases to vite.config.ts**

Add to the `resolve.alias` section:
```typescript
"electron-log": path.resolve(__dirname, "src/shims/electron-log.ts"),
// Add more as Vite build errors surface
```

- [ ] **Step 4: Verify** — `cd apps/electron && bunx vite build`

- [ ] **Step 5: Commit**

```bash
git add apps/electron/src/shims/ apps/electron/vite.config.ts
git commit -m "feat: add Node.js builtin shims for Vite renderer bundling"
```

---

## Stage 4: Electron Shell

### Task 8: Create main process

**Files:**
- Create: `apps/electron/src/main/index.ts`
- Create: `apps/electron/src/main/sidecar.ts`

- [ ] **Step 1: Create sidecar.ts**

Manages the FastAPI backend process:

```typescript
// apps/electron/src/main/sidecar.ts
import { spawn, type ChildProcess } from "node:child_process";
import { app } from "electron";
import log from "electron-log";

let backend: ChildProcess | null = null;

export async function startBackend(port = 8000): Promise<void> {
  const projectRoot = app.isPackaged
    ? process.resourcesPath
    : new URL("../../../..", import.meta.url).pathname;

  const backendDir = `${projectRoot}/backend`;

  backend = spawn("uv", ["run", "--project", backendDir, "fastapi", "run", `${backendDir}/main.py`, "--port", String(port)], {
    env: { ...process.env, ENV: "dev" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  backend.stdout?.on("data", (data) => log.info(`[backend] ${data}`));
  backend.stderr?.on("data", (data) => log.warn(`[backend] ${data}`));
  backend.on("exit", (code) => log.info(`[backend] exited with code ${code}`));

  // Wait for health check
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/docs`);
      if (res.ok) {
        log.info(`[backend] ready on port ${port}`);
        return;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Backend failed to start after ${maxRetries}s`);
}

export function stopBackend(): void {
  if (!backend) return;
  log.info("[backend] shutting down...");
  backend.kill("SIGTERM");
  setTimeout(() => {
    if (backend && !backend.killed) {
      backend.kill("SIGKILL");
    }
  }, 5000);
  backend = null;
}
```

- [ ] **Step 2: Create main index.ts**

```typescript
// apps/electron/src/main/index.ts
import { app, BrowserWindow } from "electron";
import path from "node:path";
import log from "electron-log";
import { startBackend, stopBackend } from "./sidecar";

const BACKEND_PORT = 8000;
const VITE_DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(VITE_DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  log.info("AI Nexus starting...");

  try {
    await startBackend(BACKEND_PORT);
  } catch (err) {
    log.error("Failed to start backend:", err);
    app.quit();
    return;
  }

  await createWindow();
});

app.on("window-all-closed", () => {
  stopBackend();
  app.quit();
});

app.on("before-quit", () => {
  stopBackend();
});
```

- [ ] **Step 3: Verify** — `cd apps/electron && bunx esbuild src/main/index.ts --bundle --platform=node --format=cjs --outfile=dist/main.cjs --external:electron`

- [ ] **Step 4: Commit**

```bash
git add apps/electron/src/main/
git commit -m "feat: add Electron main process with FastAPI sidecar"
```

---

### Task 9: Create preload script

**Files:**
- Create: `apps/electron/src/preload/index.ts`

- [ ] **Step 1: Create preload**

```typescript
// apps/electron/src/preload/index.ts
import { contextBridge, ipcRenderer, nativeTheme } from "electron";
import type { ElectronAPI } from "../../frontend/lib/electron-api-types";

const api: ElectronAPI = {
  platform: process.platform as ElectronAPI["platform"],

  openUrl: (url: string) => {
    ipcRenderer.invoke("shell:openExternal", url);
  },

  openInNewWindow: (url: string) => {
    ipcRenderer.invoke("shell:openExternal", url);
  },

  copyToClipboard: async (text: string) => {
    ipcRenderer.invoke("clipboard:write", text);
  },

  getSystemTheme: () => {
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  },

  onSystemThemeChange: (callback) => {
    const handler = (_event: unknown, theme: "dark" | "light") => callback(theme);
    ipcRenderer.on("theme:changed", handler);
    return () => ipcRenderer.removeListener("theme:changed", handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
```

- [ ] **Step 2: Add IPC handlers in main process**

Add to `apps/electron/src/main/index.ts` inside `app.on("ready")`:

```typescript
import { shell, clipboard, nativeTheme, ipcMain } from "electron";

ipcMain.handle("shell:openExternal", (_, url: string) => shell.openExternal(url));
ipcMain.handle("clipboard:write", (_, text: string) => clipboard.writeText(text));

nativeTheme.on("updated", () => {
  const theme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
  mainWindow?.webContents.send("theme:changed", theme);
});
```

- [ ] **Step 3: Build preload** — `cd apps/electron && bunx esbuild src/preload/index.ts --bundle --platform=node --format=cjs --outfile=dist/preload.cjs --external:electron`

- [ ] **Step 4: Commit**

```bash
git add apps/electron/src/preload/
git commit -m "feat: add Electron preload with electronAPI bridge"
```

---

### Task 10: Create electron-builder config and dev script

**Files:**
- Create: `apps/electron/electron-builder.yml`
- Create: `apps/electron/dev.ts`
- Modify: `Justfile` — add `electron-dev` recipe

- [ ] **Step 1: Create electron-builder.yml**

Adapted from Craft's config (simplified):

```yaml
appId: com.ainexus.app
productName: AI Nexus
main: dist/main.cjs
asar: false

directories:
  output: release
  buildResources: resources

files:
  - dist/**/*
  - package.json

mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: [arm64, x64]
  icon: resources/icon.icns

win:
  target: [nsis]
  icon: resources/icon.ico

linux:
  target: [AppImage]
  icon: resources/icon.png
```

- [ ] **Step 2: Create dev.ts**

```typescript
// apps/electron/dev.ts
import { spawn } from "node:child_process";
import { build } from "esbuild";

async function dev() {
  // Build main + preload
  await build({
    entryPoints: ["src/main/index.ts"],
    bundle: true, platform: "node", format: "cjs",
    outfile: "dist/main.cjs", external: ["electron"],
  });
  await build({
    entryPoints: ["src/preload/index.ts"],
    bundle: true, platform: "node", format: "cjs",
    outfile: "dist/preload.cjs", external: ["electron"],
  });

  // Start Vite dev server for renderer
  const vite = spawn("bunx", ["vite", "--port", "5173"], {
    cwd: import.meta.dirname,
    stdio: "inherit",
  });

  // Wait for Vite
  await new Promise((r) => setTimeout(r, 2000));

  // Start Electron
  const electron = spawn("bunx", ["electron", "."], {
    cwd: import.meta.dirname,
    stdio: "inherit",
    env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173" },
  });

  electron.on("exit", () => {
    vite.kill();
    process.exit(0);
  });
}

dev();
```

- [ ] **Step 3: Add Justfile recipe**

```makefile
electron-dev:
    cd apps/electron && bun run dev
```

- [ ] **Step 4: Create placeholder icons**

Create empty placeholder files in `apps/electron/resources/` — replace with real icons later.

- [ ] **Step 5: Commit**

```bash
git add apps/electron/electron-builder.yml apps/electron/dev.ts apps/electron/resources/ Justfile
git commit -m "feat: add electron-builder config and dev workflow"
```

---

### Task 11: Fix cookie domain for Electron

**Files:**
- Modify: `backend/.env`

- [ ] **Step 1: Change cookie domain**

In `backend/.env`, change:
```
COOKIE_DOMAIN=nexus-ai.localhost
```
To:
```
COOKIE_DOMAIN=localhost
```

And add `http://localhost:5173` to `CORS_ORIGINS`:
```
CORS_ORIGINS=["http://localhost:3001","http://localhost:4100","http://app.nexus-ai.localhost:1355","http://localhost:5173"]
```

- [ ] **Step 2: Verify** — start FastAPI, confirm login works from both Next.js and Vite dev server

- [ ] **Step 3: Commit**

```bash
git add backend/.env
git commit -m "fix: update cookie domain and CORS for Electron dev"
```

---

## Blockers and Open Questions

| Item | Status | Impact |
|---|---|---|
| `ConversationPage` is a server component | Must convert to client-side React Query fetch before it works in Vite renderer | Blocks Stage 3 full completion. Can be done as part of Task 6 implementation. |
| `useAppRouter` in Electron needs react-router implementation | Stage 1 creates the Next.js version. Electron's `App.tsx` (Task 6) will use react-router directly. Components using `useAppRouter` will need the Vite build to alias it to a react-router version. | Addressed by Vite alias in `vite.config.ts`. |
| App icons don't exist | Need `.icns`, `.ico`, `.png` for electron-builder | Placeholders work for dev. Real icons needed before distribution. |
| Python bundling for distribution | `uv run` requires uv + Python on user's machine | Follow Craft's `downloadUv()` pattern in `scripts/build/common.ts` for production builds. Dev builds assume uv is installed. |
| Windows testing | No Windows CI currently | Test manually before first release. |
