# AI Nexus — Desktop Shell (zero-native)

Replaces the Electron shell with a [zero-native](https://github.com/vercel-labs/zero-native) Zig shell.
Uses the **system WebView** (WKWebView on macOS, WebKitGTK on Linux) — no bundled Chromium, tiny binary.

## Prerequisites

- [Zig 0.16.0+](https://ziglang.org/download/)
- `npm install -g zero-native`
- zero-native framework checked out at `../third_party/zero-native` (relative to this directory):
  ```bash
  git clone https://github.com/vercel-labs/zero-native third_party/zero-native
  ```
  Or pass `-Dzero-native-path=/your/path` to `zig build`.

## Development

Start the frontend + backend dev servers first (`just dev`), then:

```bash
just desktop-dev   # builds the Zig shell → opens window against :3001
```

Or everything in one shot:

```bash
just desktop-dev-full
```

## Production

```bash
just desktop-build    # compile the Zig shell
just desktop-package  # package to desktop/zig-out/package/
```

## Testing the Zig shell

```bash
just desktop-test
```

## Bridge surface

All calls use `window.zero.invoke(command, payload)` from JavaScript.

| Command | Payload | Response |
|---|---|---|
| `desktop.openExternal` | `{ url }` | `{}` |
| `desktop.getPlatform` | `{}` | `{ platform: "darwin"\|"linux" }` |
| `desktop.getVersion` | `{}` | `{ version }` |
| `workspace.listRoots` | `{}` | `{ roots: string[] }` |
| `workspace.addRoot` | `{ path? }` | `{ roots: string[] }` |
| `workspace.removeRoot` | `{ path }` | `{ roots: string[] }` |
| `fs.readFile` | `{ path }` | `{ ok, content? }` |
| `fs.writeFile` | `{ path, content }` | `{ ok }` |
| `fs.listDirectory` | `{ path }` | `{ ok, entries? }` |
| `shell.run` | `{ command, cwd, timeoutMs? }` | `{ ok, stdout, stderr, exitCode }` |
| `permissions.getMode` | `{}` | `{ mode }` |
| `permissions.setMode` | `{ mode }` | `{ mode }` |

Built-in zero-native commands (no Zig handler needed):

| Command | Notes |
|---|---|
| `zero-native.dialog.openFile` | Native file/folder picker |
| `zero-native.dialog.showMessage` | Native message dialog |

### Not yet supported (streaming)

The zero-native bridge is **request/response only** — there is no push-event API yet.
The following Electron features are stubbed as `{ ok: false, reason: "not-supported" }`:

- `fs.watchDirectory` / `onFsWatchEvent`
- `shell.spawnStreaming` / `onShellStream` / `onShellStreamEnd`
- `permissions.onPrompt`
- `onMenuNewChat`

These will be wired once zero-native ships a push-event / subscribe API.

## Security

- Path operations (`fs.*`, `shell.run`) validate against the workspace root allowlist
- Bridge commands are origin-checked (`zero://app` in prod, `http://127.0.0.1:3001` in dev)
- External links are blocked by the navigation policy (`external_links: deny`); `desktop.openExternal` uses the OS opener after validating http/https scheme
- Payloads capped at 16 KiB by zero-native runtime
