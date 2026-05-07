---
# ai-nexus-dmor
title: Wire workspace into LLM providers — currently disconnected
status: todo
type: bug
priority: high
created_at: 2026-05-07T16:17:35Z
updated_at: 2026-05-07T16:17:35Z
---

## Problem

``seed_workspace`` creates a directory tree (``AGENTS.md``, ``IDENTITY.md``, ``SOUL.md``, ``TOOLS.md``, ``USER.md``, ``memory/``, ``skills/``, ``artifacts/``) per user, and we persist a ``Workspace`` row in DB with the path. **Neither LLM provider currently reads from it.**

- ``backend/app/core/providers/gemini_provider.py:242`` literally has ``tools=[]  # TODO: wire filesystem + MCP tools here``.
- ``backend/app/core/providers/claude_provider.py`` has a ``cwd`` field on ``ClaudeLLMConfig`` (line 164), but no factory or call site ever passes the user's workspace path. ``resolve_llm`` ignores it.

So the workspace seeding is currently theatre — we set it up, then ignore it during inference.

## Acceptance

- Gemini stream_fn receives a tool registry that includes filesystem read/write/list scoped to the user's default workspace path.
- ``ClaudeLLMConfig.cwd`` is populated from the user's default workspace before each request.
- A test asserts that an Agent given a "read AGENTS.md" instruction returns content from the correct workspace.
- The workspace tools must be sandboxed: a path-traversal attempt (``../../etc/passwd``) returns an error, not the file.

## Notes

- This depends on having a stable answer to "which workspace is the active one" — currently a user has exactly one default; once multi-workspace lands, the request will need to carry the workspace ID.
- Read-only first; write/exec-tools are a follow-up bean.
- Look at ``app/core/tools/`` for prior art (``exa_search`` pattern).

## Todos

- [ ] Resolve user → default workspace path in the chat API before LLM call
- [ ] Pass ``cwd=workspace_path`` to ``ClaudeLLMConfig`` in the factory
- [ ] Build a ``LocalFileSystemTools`` adapter scoped to a single workspace path; sandbox path traversal
- [ ] Wire it into ``make_gemini_stream_fn`` (replace the empty ``tools`` placeholder)
- [ ] Backend test: agent reads ``AGENTS.md`` and returns content
- [ ] Backend test: path traversal returns error, not file
- [ ] Document the contract in ``backend/app/core/workspace.py`` module docstring
