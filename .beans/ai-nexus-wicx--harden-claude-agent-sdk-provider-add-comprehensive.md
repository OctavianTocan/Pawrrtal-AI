---
# ai-nexus-wicx
title: Harden Claude Agent SDK provider + add comprehensive tests
status: completed
type: task
priority: high
created_at: 2026-05-04T08:07:44Z
updated_at: 2026-05-04T08:17:10Z
parent: ai-nexus-7k7w
---

Audit and improve backend/app/core/providers/claude_provider.py:
- session continuity with Claude SDK session_id/resume
- restrict tools (no filesystem) and lock down permission_mode
- ignore filesystem settings sources (server isolation)
- expand error handling: CLINotFoundError, CLIConnectionError, CLIJSONDecodeError, ClaudeSDKError
- handle ToolUseBlock, ToolResultBlock, ResultMessage, RateLimitEvent
- validate CLAUDE_CODE_OAUTH_TOKEN at startup
- system prompt scoped to chat (not Claude Code default)
- add comprehensive tests with FakeTransport for the SDK

## Todo
- [x] Read and understand the existing implementation and chat endpoint
- [ ] Refactor ClaudeProvider with session_id mapping, tool/permission lockdown, system prompt, expanded error handling, full event coverage
- [ ] Add /api/v1/chat tool/result events to base.py StreamEvent shape
- [ ] Add CLAUDE_CODE_OAUTH_TOKEN setting + validation in config.py
- [ ] Add a fake transport in tests for end-to-end ClaudeProvider behavior
- [ ] Add tests covering: model mapping, session_id behavior, all message/block types, all error paths, options correctness
- [ ] Update .env.example with safer defaults / docs
- [ ] Run pytest, ensure all green
- [ ] Update Epic 3 bean if needed

## Summary of Changes

### Provider hardening (backend/app/core/providers/claude_provider.py)
- Session continuity fixed. First turn passes session_id=str(conversation_id) to seed a Claude SDK session at the same UUID; subsequent turns pass resume=str(conversation_id). Detection is via claude_agent_sdk.get_session_info, with a logged best-effort fallback.
- Tool/permission lockdown. Default tools=[] disables every built-in tool (Bash, Read, Edit, Write, WebFetch). permission_mode flipped from the dangerous bypassPermissions to default so any future tool re-enable fails closed. setting_sources=[] puts the agent in SDK isolation mode so it never inherits user/project ~/.claude/settings.json, hooks, or skills.
- Custom system prompt. Replaces Claude Code default coding-agent preset with a chat-scoped prompt that explicitly tells the model it has no tools.
- Full message/block coverage. Translates AssistantMessage (text, thinking, tool_use, tool_result), UserMessage tool_result blocks, ResultMessage errors, and RateLimitEvent rejected into StreamEvent dicts. SystemMessage and unknown types are no-ops by design.
- Full error coverage. Catches CLINotFoundError, CLIConnectionError, ProcessError, CLIJSONDecodeError, and base ClaudeSDKError, each with an actionable message. Non-SDK exceptions propagate.
- OAuth token forwarding. New ClaudeProviderConfig exposes oauth_token and extra_env, both merged into ClaudeAgentOptions.env. Pydantic-settings reads .env but does not push to os.environ, so the bundled CLI subprocess would otherwise miss the token.

### Config (backend/app/core/config.py, backend/.env.example)
- Added optional claude_code_oauth_token: str = "" to Settings.
- Updated .env.example to clarify the token is only required when a Claude model is selected.

### Factory (backend/app/core/providers/factory.py)
- Reads settings.claude_code_oauth_token and injects via ClaudeProviderConfig so the provider stays config-agnostic and trivially testable.

### Public API (backend/app/core/providers/__init__.py)
- Re-exports ClaudeProvider and ClaudeProviderConfig.

### Dependency pin (backend/pyproject.toml)
- claude-agent-sdk pinned to >=0.1.72,<0.2.

### Tests (backend/tests/test_claude_provider.py - 46 new tests)
- _resolve_sdk_model: 7 tests (parametrized known IDs + unknown passthrough).
- _tool_result_to_text: 5 tests (None, str, list-of-text-dicts, list with mixed shapes, arbitrary types).
- _events_from_message: 14 tests covering every message and block kind including assistant error field, user-side tool results, result error vs success, rate-limit rejected vs warning, system messages, unknown types.
- ClaudeProvider options: 8 tests (defaults lock down tools+settings+max_turns+permission_mode+system_prompt; first-turn session_id vs subsequent-turn resume; OAuth env forwarding; extra_env merge; model mapping; full custom config override).
- Streaming end-to-end: 3 tests (single text round-trip; full mixed stream preserves order including tool_use/tool_result correlation by ID; empty stream emits nothing).
- Error handling: 6 tests (every documented SDK error type to single error event; non-SDK exceptions propagate).
- Session probe fallback: 1 test (filesystem error during probe degrades to new-session semantics).
- Factory wiring: 2 tests (token from settings reaches provider; blank token coerces to None).

### Verification
- Backend test suite: 38 to 84 tests, all green (uv run pytest tests/).
- All changed files compile cleanly (python -m py_compile).
