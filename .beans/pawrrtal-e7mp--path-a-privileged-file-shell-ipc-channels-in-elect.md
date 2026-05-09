---
# pawrrtal-e7mp
title: 'Path A: privileged file + shell IPC channels in Electron main'
status: completed
type: feature
priority: high
created_at: 2026-05-05T06:08:11Z
updated_at: 2026-05-05T07:05:23Z
---

Implementation bean for **Path A** of the privileged-ops decision (see "Decide: privileged-ops..." bean). Only start once that decision lands.

**Scope.** Add namespaced IPC channels to `electron/src/ipc.ts` for the agent's file + shell needs. Mirror surface in `frontend/lib/desktop.ts` with web fallbacks (no-op or backend-relayed).

**Channels to add:**
- `fs:read-file(path)` → string
- `fs:write-file(path, content)` → void
- `fs:list-directory(path, opts)` → DirEntry[]
- `fs:watch-directory(path)` → Subscription (events via webContents.send)
- `shell:run({ command, args, cwd, env, timeout_ms })` → { stdout, stderr, exit_code }
- `shell:spawn-streaming(...)` → token stream pushed via webContents.send
- `workspace:get-roots()` → user-allowlisted directories
- `workspace:add-root(path)` → adds to allowlist

**Security.**
- Validate every path is under an allowlisted workspace root via a `validateFilePath` helper (mirror Craft's pattern).
- Validate `shell:run` commands against a denylist + ask user before first run of a new command per session (electron-store `confirmedCommands` set).
- Subprocess timeout default 30s; `kill()` on timeout.

**Tests.**
- Unit tests for the path-allowlist validator.
- Unit tests for `lib/desktop.ts` web fallbacks for the new methods.

## Todo
- [ ] Land the privileged-ops decision ADR first
- [ ] Add `electron/src/workspace.ts` with allowlist + path validator
- [ ] Add `fs:*` channels + handlers
- [ ] Add `shell:*` channels + handlers (exec + spawn-streaming)
- [ ] Mirror in `frontend/lib/desktop.ts` with web fallbacks (`/api/v1/fs/*` proxy)
- [ ] Tests for validator + new wrappers

## Outcome

Implemented on branch `feat/electron-privileged-ops`:
- electron/src/workspace.ts (allowlist + path validator + symlink defence)
- electron/src/permissions.ts (Claude-Code-style ladder + decision storage)
- electron/src/handlers/fs.ts (read/write/list/watch via chokidar)
- electron/src/handlers/shell.ts (run + spawn-streaming + kill, timeouts)
- electron/src/preload.ts extended with pawrrtal.fs.* / shell.* / workspace.* / permissions.* bridges
- frontend/lib/desktop.ts mirrored every method with web fallbacks (no-op + 'desktop-only' envelope)

Coverage on the new electron code: 63% statements / 67% lines (target was 60%).
Tests added: 45 in electron/, +18 in frontend/lib/desktop.test.ts.
