# Pawrrtal — Electrobun spike

**Desktop shell** that wraps the same Next.js frontend as `electron/`, using [Electrobun](https://electrobun.dev) (Bun main process + system webview) instead of Electron. This directory is a proof-of-concept for a lighter native bundle and typed IPC.

At a glance:

- **Typed RPC** — `src/shared/rpc-types.ts` replaces preload + `contextBridge` + string `ipcMain` channels.
- **Small footprint** — system webview instead of shipping Chromium (~14 MB class vs ~150 MB Electron).
- **Dev ergonomics** — `just electrobun-dev` spawns the monorepo dev stack (Next.js on **:3001**, FastAPI on **:8000**) and opens the shell.
- **Tests without a display** — Vitest in Node covers store, workspace paths, and permission state.

## Why Electrobun (vs Electron)

| | Electron | Electrobun |
|---|---|---|
| Bundle size | ~150 MB | ~14 MB (system webview) |
| App updates | Full re-download | bsdiff patch ≥ 4 KB |
| Runtime | Node.js | Bun |
| IPC | `ipcMain.handle` + `contextBridge` | Typed `BrowserView.defineRPC<T>` |
| Store | electron-store | JSON file (`src/bun/store.ts`) |

## Repository layout

```
electrobun/
├── electrobun.config.ts     # Build config (entrypoint, views, app identity)
├── src/
│   ├── shared/
│   │   └── rpc-types.ts     # Typed IPC surface (replaces preload.ts + ipc.ts)
│   └── bun/
│       ├── index.ts          # Main process (BrowserWindow + RPC handlers)
│       ├── store.ts          # Lightweight JSON file store
│       ├── workspace.ts      # Workspace allowlist (ported from electron/)
│       ├── permissions.ts    # Permission state machine (ported from electron/)
│       ├── handlers/
│       │   ├── fs.ts         # Filesystem handlers
│       │   └── shell.ts      # Shell execution handlers (uses Bun.spawn)
│       └── *.test.ts         # Vitest tests (node env, no display needed)
```

## Architecture notes (vs `electron/`)

### IPC bridge

**Electron:** `preload.ts` exposes `contextBridge.exposeInMainWorld('pawrrtal', api)`; handlers registered via `ipcMain.handle('channel', fn)`.

**Electrobun:** `src/shared/rpc-types.ts` defines `PawrrtalRPCType`. Main: `BrowserView.defineRPC<PawrrtalRPCType>({ handlers })`. Webview: `Electroview.defineRPC<PawrrtalRPCType>({ handlers })`. No preload script.

### Persistent store

**Electron:** `electron-store` (Node-only npm package).

**Electrobun:** `src/bun/store.ts` — typed wrapper around `Bun.file` / `Bun.write` with `get` / `set` shaped like electron-store for an easier port.

### Push events (main → webview)

**Electron:** `webContents.send('channel', payload)` + `ipcRenderer.on('channel', handler)`.

**Electrobun:** `win.webview.rpc.send.channelName(payload)` — typed channels instead of string names.

### Permission prompt

**Electron:** `ipcMain.on('permissions:respond', ...)` + `webContents.send('permissions:prompt', ...)`.

**Electrobun:** `bun.messages.permissionsRespond` RPC handler + `webview.messages.permissionsPrompt` RPC send.

## Prerequisites

- **Bun** (matches repo tooling; Electrobun bundles are Bun-driven).
- **Monorepo install:** `just install` (or `bun install` at repo root + `cd backend && uv sync` as in the root README) so `bun run dev` at the repo root works.
- **Electrobun CLI** — pulled via this package’s `electrobun` dependency when you `bun install` inside `electrobun/`.

## Development

### Recommended: one command from the repo root

```bash
just electrobun-dev
```

This runs `cd electrobun && bun run start`, which:

1. Sets `PAWRRTAL_REPO_ROOT` to the monorepo root.
2. Builds the shell (`electrobun build`).
3. Launches `electrobun dev`; the main process spawns **`bun run dev`** at the repo root (`dev.ts`), starts **Next.js on http://localhost:3001** and **FastAPI on http://localhost:8000**, waits until **:3001** accepts connections, then loads the app.

> First cold build can take on the order of ~30s; later runs are faster. A **white window** usually means the dev server is still starting or failed to bind — check the terminal for `dev.ts` output.

### Already running `just dev`?

If you already started the stack in another terminal (`just dev`), you can still run `just electrobun-dev`: the spawned `bun run dev` may contend for ports; prefer **either** the standalone `just dev` workflow **or** let Electrobun spawn dev, not both unless you know your ports are free.

### From `electrobun/` only

```bash
cd electrobun
bun install
bun run start
```

Do not run `electrobun dev` without the `bun run start` script if you expect dev mode — `PAWRRTAL_REPO_ROOT` gates dev vs production server startup in `src/bun/index.ts`.

### Production-style local run (bundled Next standalone)

```bash
just electrobun-prod
```

Builds the Next standalone bundle, builds the shell, and runs against the embedded server (see `justfile`).

## Tests

```bash
cd electrobun
bun install
bun test
```

Coverage: `Store`, `workspace` (path validation, roots), `permissions` (state machine, prompt round-trip). No Electrobun binary or display required.

## Documentation map

| Topic | Where |
|---|---|
| Electron parity / IPC naming | `electron/README.md` |
| Build & identity | `electrobun.config.ts` |
| RPC contract | `src/shared/rpc-types.ts` |
| Dev server lifecycle | `src/bun/server.ts` |
| Electrobun product docs | [electrobun.dev](https://electrobun.dev) |

## Security note

The desktop shell is a **trust boundary**: RPC handlers gate filesystem and shell access (workspace allowlists, permission prompts). Treat new handlers like Electron `ipcMain` handlers — validate inputs and reject path escapes. The Electron shell doc in `electron/README.md` describes the parallel IPC-hardening expectations.

## Known gaps vs `electron/`

- `showOpenFolderDialog` is a stub (native folder dialog still being evaluated in Electrobun v1.x).
- Linux: enable `bundleCEF: true` if you need full webview layering.
- `app.requestSingleInstanceLock()` is handled by Electrobun.
- Windows: `Bun.spawn` paths — verify escaping for user-supplied paths.

## Upstream

Questions about the runtime or packaging belong with **Electrobun** ([electrobun.dev](https://electrobun.dev)), not this app repo.
