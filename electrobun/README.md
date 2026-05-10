# Pawrrtal — Electrobun Spike

Proof-of-concept port of `electron/` → [Electrobun](https://electrobun.dev) for evaluating a lighter-weight desktop shell for Pawrrtal.

## Why

| | Electron | Electrobun |
|---|---|---|
| Bundle size | ~150 MB | ~14 MB (system webview) |
| App updates | Full re-download | bsdiff patch ≥ 4 KB |
| Runtime | Node.js | Bun |
| IPC | `ipcMain.handle` + `contextBridge` | Typed `BrowserView.defineRPC<T>` |
| Store | electron-store | JSON file (`src/bun/store.ts`) |

## Structure

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

## Key Architectural Differences

### IPC Bridge
**Electron:** `preload.ts` exposes `contextBridge.exposeInMainWorld('pawrrtal', api)`; handlers registered via `ipcMain.handle('channel', fn)`.

**Electrobun:** Single shared `src/shared/rpc-types.ts` defines `PawrrtalRPCType`. The main process calls `BrowserView.defineRPC<PawrrtalRPCType>({ handlers })`. The webview uses `Electroview.defineRPC<PawrrtalRPCType>({ handlers })`. No preload script needed.

### Persistent Store
**Electron:** `electron-store` (Node-only npm package).

**Electrobun:** `src/bun/store.ts` — thin typed wrapper around `Bun.file` / `Bun.write`. Same `get(key)` / `set(key, value)` API as electron-store for easy port.

### Push Events (webview ← main)
**Electron:** `webContents.send('channel', payload)` + `ipcRenderer.on('channel', handler)`.

**Electrobun:** `win.webview.rpc.send.channelName(payload)` — type-safe, no string channel names.

### Permission Prompt
**Electron:** `ipcMain.on('permissions:respond', ...)` + `webContents.send('permissions:prompt', ...)`.

**Electrobun:** `bun.messages.permissionsRespond` RPC message handler + `webview.messages.permissionsPrompt` RPC send.

## Running Tests

```bash
cd electrobun
bun install
bun test
```

Tests cover `Store`, `workspace` (path validation, root management), and `permissions` (state machine, prompt round-trip). All run in Vitest's node environment — no display, no Electrobun binary needed.

## Known Gaps vs Electron Shell

- `showOpenFolderDialog` is a stub (native dialog API still being evaluated in Electrobun v1.x).
- Linux: CEF flag should be enabled (`bundleCEF: true`) to get full webview layering.
- `app.requestSingleInstanceLock()` is handled automatically by Electrobun.
- Windows: shell spawn uses `Bun.spawn` — verify path escaping on Windows paths.
