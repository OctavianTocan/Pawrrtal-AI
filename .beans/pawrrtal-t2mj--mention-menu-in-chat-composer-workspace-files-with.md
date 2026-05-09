---
# pawrrtal-t2mj
title: '@-mention menu in chat composer: workspace files (with fuzzy filter)'
status: todo
type: feature
priority: normal
created_at: 2026-05-07T16:30:17Z
updated_at: 2026-05-07T16:30:17Z
---

## Goal

When the user types ``@`` in the chat composer, surface a popover menu listing files in the agent's workspace. As the user continues typing, filter results by closest match in file name (fuzzy / substring).

## Reference

User shared a screenshot from a Codex-style app with a menu that opens on ``@`` and shows three sections — **Agents**, **Plugins**, **Files** — each filterable as the user types.

## Phase 1 (this bean)

Just **Files**. Agents and Plugins are deferred to follow-up beans once the menu primitive lands and we have those concepts wired.

## Backend

We need an endpoint that lists files under a user's workspace. Existing workspace API has ``GET /api/v1/workspaces/{id}/tree`` (per ``backend/tests/test_workspace.py`` covers a tree shape). For ``@``-search we want a flat, filterable list:

```
GET /api/v1/workspaces/{id}/files?q=<query>&limit=50
→ [
    { "path": "memory/notes.md", "name": "notes.md", "size": 1234, "updated_at": "..." },
    { "path": "skills/web-research/SKILL.md", "name": "SKILL.md", ... },
    ...
  ]
```

- ``q`` empty → return the most recently updated ``limit`` files.
- ``q`` non-empty → filter server-side with substring + fuzzy fallback (e.g. ``rapidfuzz``-style scoring); cap response at ``limit``.
- Auth: ``current_active_user`` + ``user_id`` must match workspace owner.
- Path-traversal sanitised, never return paths above the workspace root.
- Hidden files (``.gitkeep``) excluded by default; ``?include_hidden=true`` to opt in.

## Frontend

### Detection

Composer is at ``frontend/features/chat/components/...`` (PromptInput component). Listen for ``@`` at the caret position **on a word boundary** (start of input, after whitespace) — typing ``user@example.com`` should NOT trigger the menu.

State machine:
- ``idle`` — no menu
- ``open`` — caret is in an active mention; track ``startIndex`` (where the ``@`` is) and ``query`` (text since the ``@``)
- A space, Enter, or Esc closes the menu without insertion.

### Popover

- Anchored above the composer caret (Radix Popover with ``side="top"``).
- Renders the existing ``ResponsiveModal`` primitives if matching the style of model-selector dropdown; otherwise a custom popover sized to the result list.
- Loading skeleton while query is in flight (per the new DESIGN.md async-load convention — cross-ref pawrrtal-f58v).
- Empty state ("No files match") when results are zero.
- Keyboard nav: arrow keys, Enter to insert, Esc to dismiss.
- Click on an item also inserts.

### Insertion contract

When a file is selected, replace the ``@<query>`` substring with a stable token. Two options:

1. ``@workspace:memory/notes.md`` — plain text, the LLM parses on its own once the prompt lands.
2. A rich pill component rendered inline (``contenteditable`` or a controlled span list).

Phase 1: option 1 (plain text). Pill UI is a follow-up bean.

The token format must be one the backend prompt-builder strips/expands so the LLM sees the file content rather than the literal ``@workspace:...``. That contract (server-side resolution of mention tokens to embedded content) is its **own** sub-task — see Open questions.

### Filtering UX

- Substring match on ``path`` and ``name`` (case-insensitive).
- If no substring match, fall back to fuzzy via the same backend query.
- Highlight matching characters in the result list (``<mark>`` segments).
- Newest-first when the query is empty.
- Cap at 50 results.

## Open questions

- **Server-side mention resolution.** When the user sends a message containing ``@workspace:foo.md``, does the backend (a) embed the file content into the system prompt, (b) hand the LLM a tool that reads the file by reference, or (c) split into both depending on size? This decision needs its own bean — coordinate with pawrrtal-dmor (workspace → providers wiring) since both depend on the same workspace-files contract.
- **Mention pill vs plain text** — phase 1 plain text, phase 2 pill once the input model is decided.
- **Multi-workspace** — ``GET /api/v1/workspaces/{id}/files`` requires a workspace ID. The composer needs to know which workspace the conversation belongs to (currently a user has exactly one default).

## Acceptance

- Typing ``@`` in the composer opens the popover at the caret, listing recently-updated workspace files.
- Continuing to type filters live (debounced ~80ms).
- Arrow keys + Enter insert the file token.
- Esc / Tab / space (after a complete word) dismisses without insertion.
- Inserted token is plain text in the input value; backend prompt-builder resolves it (or a follow-up bean tracks that contract).
- The popover follows the new async-load skeleton convention while results load.

## Non-goals

- Agents + Plugins sections (separate beans, after Phase 1 lands).
- Rich pill rendering inside the input (Phase 2).
- Multi-workspace switching (waits on multi-workspace UX).

## Todos

- [ ] Backend: ``GET /api/v1/workspaces/{id}/files?q=&limit=`` with auth + traversal guards
- [ ] Backend: substring + fuzzy filter (consider ``rapidfuzz``)
- [ ] Backend tests (auth boundary, path traversal, fuzzy ranking)
- [ ] Frontend: ``@`` detection state machine in composer
- [ ] Frontend: popover UI + keyboard nav + skeleton + empty state
- [ ] Frontend: TanStack Query hook with debounced query param
- [ ] Frontend: insertion of ``@workspace:<path>`` token
- [ ] Spawn follow-up bean for server-side mention resolution
- [ ] Spawn follow-up bean for Agents + Plugins sections
- [ ] Spawn follow-up bean for rich pill rendering
- [ ] DESIGN.md: Composer Mentions section

## Related

- pawrrtal-dmor (workspace → providers wiring) — defines whether the LLM can actually read the referenced file
- pawrrtal-f58v (DESIGN.md async-load convention) — the popover follows that pattern
- pawrrtal-kds0 (component primitives epic) — the popover should reuse the project's primitive popover, not invent one
