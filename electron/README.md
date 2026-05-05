# AI Nexus — Electron desktop shell

Desktop wrapper around the same Next.js frontend that runs on the
web. Web behavior is **completely unchanged** — Electron is purely
additive.

## Architecture

```
┌────────────────────────────┐
│   Electron main process    │  electron/src/main.ts
│   (Node + Electron APIs)   │
│                            │
│  ┌──────────────────────┐  │  electron/src/server.ts
│  │ Spawns or attaches   │  │
│  │ to Next.js server    │  │
│  └──────────┬───────────┘  │
│             ▼              │
│  ┌──────────────────────┐  │  preload.ts → contextBridge
│  │ BrowserWindow w/     │◄─┼──────  window.aiNexus.* (typed)
│  │ context isolation +  │  │
│  │ sandbox + no Node    │  │
│  └──────────────────────┘  │
└────────────────────────────┘
             │
             ▼
http://localhost:PORT  ← Next.js (dev: existing :3001, prod: spawned)
             │
             ▼
http://localhost:8000  ← FastAPI backend (unchanged)
```

The renderer is the same Next.js app you get on the web — it has
**zero Electron-specific code**. Anywhere the FE wants a desktop-only
feature it goes through `frontend/lib/desktop.ts`, which falls back to
web equivalents (`window.open`, no-op handlers) when not in Electron.

## Quick start

### Dev (against the running Next.js dev server)

```bash
just dev          # terminal 1: backend + frontend dev servers
just electron-dev # terminal 2: builds the shell + launches Electron
```

The shell waits for `http://localhost:3001` to come up, so you can
start the two in either order. HMR continues to work because the
shell is just pointing a BrowserWindow at the existing dev server.

### Prod-like (no external dev server)

```bash
just electron-prod
```

Builds the Next.js standalone bundle (`frontend/.next/standalone/`),
compiles the Electron TS, then spawns the standalone server on a free
port and points the BrowserWindow at it.

### Distributable installer

```bash
just electron-dist   # outputs to electron/dist-app/
```

`electron-builder` produces a DMG + ZIP on macOS, NSIS on Windows,
AppImage on Linux. Code signing is intentionally disabled — set
`CSC_LINK` + `CSC_KEY_PASSWORD` env vars when you're ready.

## Backend

The desktop app does NOT bundle the FastAPI backend (Python packaging
is its own beast). Two ways to point at one:

1. **Local backend** — run `just dev` (or `cd backend && uv run
   uvicorn app.main:app`); the desktop app uses
   `http://localhost:8000` by default.
2. **Remote backend** — set `BACKEND_URL=https://api.example.com`
   in the environment before launching. The main process injects
   it into the spawned Next.js server's env so `frontend/lib/api.ts`
   resolves it correctly.

## Adding desktop-only features

Three files always change together:

1. `electron/src/preload.ts` — add the method to the
   `aiNexus` object exposed via `contextBridge`.
2. `electron/src/ipc.ts` — add the matching `ipcMain.handle` channel
   on the main side.
3. `frontend/lib/desktop.ts` — add a thin wrapper that calls
   `window.aiNexus?.method(...)` with a web-safe fallback.

Then call `desktop.method(...)` from anywhere in the FE — the
fallback ensures the same call site works on both shells.

## Security model

The renderer is locked down:

- `nodeIntegration: false` — no `require`, no Node globals.
- `contextIsolation: true` — preload runs in an isolated world.
- `sandbox: true` — OS-level sandbox primitives.
- `webSecurity: true` — same-origin policy enforced.
- External links are denied via `setWindowOpenHandler` and routed to
  the OS browser through `shell.openExternal` (which validates that
  the URL is `http`/`https` only — no `file://`, no custom protocols).

Adding new IPC channels: keep them under the `desktop:*` namespace,
validate every incoming argument, and never expose raw `ipcRenderer`
to the page.
