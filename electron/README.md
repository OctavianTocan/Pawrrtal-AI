# Pawrrtal — Electron desktop shell

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
│  │ BrowserWindow w/     │◄─┼──────  window.pawrrtal.* (typed)
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

### macOS window chrome

We use **`titleBarStyle: 'default'`** so close / minimize / zoom are drawn by
the **standard AppKit title bar** at full system size. **`hidden`** and
**`hiddenInset`** paint Chromium overlay controls in the web content region —
they look visibly smaller than Finder / Safari (trade-off: one native title
strip above the page instead of embedding controls in the custom header row).

The value lives in **`electron/src/window-chrome.ts`** and is consumed only by
**`main.ts`** (not preload). If you ever switch to overlay styles, pad the
in-app header in the frontend yourself — there is no automatic inset bridge.

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

## Privileged operations (file + shell)

The desktop shell exposes file + shell capabilities the web build can't
have. Architecture follows the *client-tool* pattern documented in
[ADR 2026-05-05](../docs/decisions/2026-05-05-electron-privileged-ops-in-main.md):

- The agent loop stays in FastAPI.
- Tool *definitions* are registered server-side; tool *execution* for
  desktop tools tunnels through the renderer to Electron main via the
  `pawrrtal.fs.*` / `pawrrtal.shell.*` bridges.
- Web users get the server-tool subset; desktop users get the full
  toolset. Same UI, no per-shell branches in the renderer.

### Workspace allowlist

`electron/src/workspace.ts` keeps a persistent list of directories the
agent is allowed to touch. The default is `~/Pawrrtal-Workspace/`,
auto-created on first launch. Add more from the FE via
`addWorkspaceRoot()` (calls the native folder picker if no path given).

Every `fs:*` and `shell:*` handler runs `validateFilePath()` before
acting; paths outside every root are rejected, including symlinks
inside a root that point outside.

### Permission ladder

`electron/src/permissions.ts` mirrors Claude Code's permission model:

| Mode | Behaviour |
| --- | --- |
| `default` | prompt per `<op>:<command>:<root>` until the user picks "Always allow" |
| `accept-edits` | auto-allow `fs:write`; still prompt for shell |
| `yolo` | auto-allow everything |
| `plan` | deny every write/exec; reads still work |

Per-decision scopes:

- `once` — allow this single op
- `session` — allow until the app restarts
- `always` — persist via `electron-store`

### IPC channel reference

| Channel | Use |
| --- | --- |
| `fs:read-file(path)` | Read text file inside a root |
| `fs:write-file(path, content)` | Write text file (gated by perms) |
| `fs:list-directory(path)` | List entries |
| `fs:watch-directory(path)` → `fs:watch-event` | Subscribe via chokidar |
| `fs:unwatch(id)` | Tear down |
| `shell:run({ command, args, cwd, env, timeoutMs })` | One-shot exec |
| `shell:spawn-streaming(...)` → `shell:stream` / `shell:stream-end` | Long-running |
| `shell:kill(jobId)` | Cancel streaming job |
| `workspace:list-roots` / `workspace:add-root` / `workspace:remove-root` | Manage allowlist |
| `permissions:get-mode` / `permissions:set-mode` | Toggle the ladder |
| `permissions:prompt` (push) / `permissions:respond` (pull) | Renderer-driven prompts |

## Adding desktop-only features

Three files always change together:

1. `electron/src/preload.ts` — add the method to the
   `pawrrtal` object exposed via `contextBridge`.
2. `electron/src/ipc.ts` — add the matching `ipcMain.handle` channel
   on the main side.
3. `frontend/lib/desktop.ts` — add a thin wrapper that calls
   `window.pawrrtal?.method(...)` with a web-safe fallback.

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
