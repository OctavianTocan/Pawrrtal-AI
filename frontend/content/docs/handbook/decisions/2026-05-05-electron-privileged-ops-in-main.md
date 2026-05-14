---
title: Privileged ops live in the Electron main process; agent stays in FastAPI
description: ADR — desktop-only capabilities (window controls, auto-update, tray) are handled in the Electron main process via IPC.
---

# Privileged ops live in the Electron main process; agent stays in FastAPI

- **Status:** Accepted
- **Date:** 2026-05-05
- **Related work:** branch `feat/electron-privileged-ops`, beans `#pawrrtal-5rwv`, `#pawrrtal-e7mp`

## Context

The Electron desktop shell ships
([branch `feat/electron-shell`](../../electron/README.md)). To make the
agent able to *modify the user's computer* (file edits, shell commands,
local workspace scanning), some code has to run with the user's full
filesystem + shell access. That code can't live in the renderer (it's
sandboxed) and shouldn't live in the existing FastAPI backend (which
runs on the server, not the user's machine).

Two implementation strategies exist:

1. **Privileged ops in the Electron main process.** The renderer stays
   sandboxed; main owns every fs/shell capability via namespaced IPC
   (`fs:*`, `shell:*`, `workspace:*`).
2. **Bundle FastAPI as a PyInstaller sidecar.** Ship the existing
   Python backend as a per-platform binary; main spawns it on a free
   port; the renderer talks to it like normal.

We also need to decide *where the agent loop runs* — the orchestrator
that picks which tool to call at each step.

## Decision

Adopt **strategy 1 (privileged ops in Electron main)** for v1. Adopt the
**client-tool pattern** for the agent: keep the agent loop in FastAPI,
register desktop-only tools as "client tools" whose execution is
delegated through the renderer back to the Electron main process.

### Why strategy 1 over the PyInstaller sidecar

We surveyed [Craft Agents](https://github.com/lukilabs/craft-agents-oss)
on 2026-05-05. Craft does not bundle a backend. Their privileged ops
live in the Electron main process via Node's `fs/promises` +
`child_process`, gated by a path allowlist. They DO ship a native
binary (the Claude Agent SDK at ~210 MB), but that's a runtime
artifact, not a server. Renderer ↔ main is a local WebSocket RPC;
renderer is locked down (`contextIsolation: true`, `nodeIntegration:
false`).

Concretely, strategy 1 wins on:

- **Packaging surface.** PyInstaller has known fragility with `numpy`,
  `tiktoken`, `cryptography`, and `sqlalchemy` native deps. Each adds
  notarization complications on macOS.
- **Download size.** Bundling Python adds 80–150 MB per platform.
  Node is already in Electron.
- **Subprocess lifecycle.** A spawned sidecar can orphan on hard quit
  and leaks a port-listener. Avoiding it removes a class of bug.
- **Latency.** IPC into main is ~1 ms; spawning a sidecar then HTTP'ing
  to it adds 5–20 ms per call plus startup time.
- **Security model.** The Electron main process model is well-documented
  and is what Craft, VS Code, and most other agent-shells use. We don't
  invent.

PyInstaller bundling is preserved as a fallback bean (`#pawrrtal-om7i`)
should the two-implementation tax ever become load-bearing. As of v1,
we expect zero duplication because of the client-tool pattern (next
section).

### Why the client-tool pattern over moving the agent

The constraint is **"the same UX has to work on web and desktop."** We
considered three places to put the agent loop:

| Where | Web works? | Duplicate code? | Effort |
| --- | --- | --- | --- |
| FastAPI (today) + tools execute server-side only | Yes — but no fs/shell access | None | Zero |
| FastAPI + **client tools** routed through FE→IPC | **Yes — fs/shell available on desktop, omitted on web** | **None** | **Small** |
| Move agent into renderer | Yes, but renderer has to call FastAPI for LLM and IPC for fs — two paths | Moderate | Large |
| Add a Node agent loop in Electron main | Web doesn't get it | High (two agent stacks) | Large |

We pick row 2. Mechanism (same as Claude Code, Cursor, and the
[OpenAI function-calling](https://platform.openai.com/docs/guides/function-calling)
+ [MCP](https://modelcontextprotocol.io/)
client patterns):

1. Backend declares each tool as either a *server tool* (executed in
   FastAPI) or a *client tool* (executed by the calling frontend).
2. When the agent picks a client tool, the SSE stream emits a
   `tool_call_request{id, name, args}` event instead of running it.
3. The FE forwards to Electron main via the existing `pawrrtal`
   contextBridge (`pawrrtal.fs.writeFile(...)`, etc.).
4. The FE POSTs the result back to a backend `/api/v1/chat/tool_result`
   endpoint with the matching `tool_call_id`.
5. Backend resumes the agent loop with the tool result.

On **web**, the backend simply doesn't expose fs/shell tools to the
agent (or exposes a smaller subset like `web_search`). The renderer
never sees a `tool_call_request` for a desktop-only tool. No
"if-desktop" branches in the FE.

On **desktop**, the backend exposes the full toolset. The renderer
forwards each request to Electron main. Same chat, same UI, same
streaming wire format — just a richer toolset.

## Consequences

### Positive

- One agent implementation. One place to add tools. No Python rewrite.
- Web users unaffected. Desktop users get a strictly larger capability
  set.
- Renderer remains sandboxed. Privileged ops are gated by a per-path
  allowlist + Claude-Code-style permission prompts.
- API keys stay server-side. Renderer never holds them.

### Negative / acceptable

- One network round-trip per client-tool call (~50–200 ms). Acceptable
  for the kinds of tool calls the agent makes (file edits, shell
  commands rarely come back faster than that anyway).
- Backend has to grow a `tool_result` ingestion endpoint and a way to
  pause/resume the streaming agent on a client-tool turn. Standard
  pattern; the Agno + Claude Agent SDK both support it.

### Operational answers we resolved at the same time

- **Workspace root:** auto-create `~/Pawrrtal-Workspace/` on first
  launch; the user can add more via the workspace settings surface.
- **Permission model:** Claude-Code-style — *Allow once / Allow for
  this session / Always allow / Deny*, plus a global mode (`default`,
  `accept-edits`, `yolo`, `plan`). Decisions persisted in
  `electron-store` keyed by `<tool>:<command>:<root-id>`.
- **Web fallback for fs/shell:** no-op + toast ("desktop-only
  feature"). We do *not* mirror these into the FastAPI backend — that
  would defeat the point of the client-tool pattern.
- **File watcher:** `chokidar` for cross-platform reliability.
- **Streaming shell:** ship both `shell:run` (single-shot) and
  `shell:spawn-streaming` (line-by-line via `webContents.send`).

## Out of scope for this ADR

- The actual *registration* of client tools server-side — that's a
  follow-up bean once this branch lands and the IPC surface is real.
- PyInstaller bundling — `#pawrrtal-om7i` if/when needed.

## References

- Craft Agents source survey, 2026-05-05 (renderer ↔ main WS RPC,
  bundled `claude` binary, no Python sidecar).
- [Claude Code permissions documentation](https://docs.claude.com/en/docs/claude-code/iam) — basis for the
  per-command/per-session/always permission ladder.
- [MCP client tools](https://modelcontextprotocol.io/specification/server/tools)
  — same routing pattern, different transport.
- `electron/README.md` — desktop shell architecture.
