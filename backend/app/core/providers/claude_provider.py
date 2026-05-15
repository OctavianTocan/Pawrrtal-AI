"""Claude Agent SDK provider.

Wraps :func:`claude_agent_sdk.query` to expose a streaming chat interface
that matches the rest of the :class:`AILLM` protocol — every tick
becomes a :class:`StreamEvent` dictionary.

Notable design decisions:

- **Session continuity** maps each app-level ``conversation_id`` onto a
  Claude SDK session ID with the same value. The first turn passes
  ``session_id=str(conversation_id)`` to seed a brand-new session;
  subsequent turns pass ``resume=str(conversation_id)`` to reload the
  history. We detect "first turn" via :func:`claude_agent_sdk.get_session_info`,
  which is a cheap stat on the local Claude transcript directory.

- **Tool surface** is locked down via ``tools=[]`` by default. The chat
  endpoint doesn't expect filesystem access from the model; disabling
  tools removes an entire class of accidental exposure (Bash, Edit,
  Write, WebFetch, ...).

- **Setting sources** are pinned to ``[]`` so the agent never inherits
  ``~/.claude/settings.json`` files, hooks, or skills from the developer
  machine. This is the SDK's "isolation" mode.

- **System prompt** is a chat-scoped one — not Claude Code's
  software-engineer default — so the model behaves like a chat assistant
  on this surface.

- **Errors** are caught at every documented SDK error type and converted
  into ``StreamEvent(type="error")`` so the chat endpoint surfaces them
  as SSE events instead of crashing the connection.

- **OAuth token** is forwarded explicitly to the subprocess via
  ``ClaudeAgentOptions.env``. Pydantic-settings reads ``.env`` files but
  does not push the values back into ``os.environ``, so the bundled CLI
  subprocess would otherwise miss the token.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKError,
    CLIConnectionError,
    CLIJSONDecodeError,
    CLINotFoundError,
    PermissionMode,
    ProcessError,
    get_session_info,
    query,
)

from app.core.agent_loop.types import AgentTool, PermissionCheckFn
from app.core.agent_system_prompt import (
    DEFAULT_AGENT_SYSTEM_PROMPT as _DEFAULT_SYSTEM_PROMPT,
)
from app.core.config import settings as _settings
from app.core.keys import resolve_api_key

from ._claude_tool_bridge import (
    MCP_SERVER_NAME as AGENT_TOOL_MCP_SERVER_NAME,
)
from ._claude_tool_bridge import (
    allowed_tool_ids,
    build_mcp_server,
    make_can_use_tool,
)
from .base import ReasoningEffort, StreamEvent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Defaults — tunable at construction time via :class:`ClaudeLLMConfig`.
# ---------------------------------------------------------------------------

# Map our frontend model IDs to Claude SDK model strings. The frontend uses
# Anthropic marketing names ("4-6", "4-7"); the Claude SDK accepts the API
# model IDs directly. When a stable alias arrives upstream we can drop the
# mapping; for now we pin explicitly so a typo at the frontend layer fails
# loudly here.
_MODEL_MAP: dict[str, str] = {
    "claude-haiku-4-5": "claude-haiku-4-5",
    "claude-sonnet-4-5": "claude-sonnet-4-5",
    "claude-sonnet-4-6": "claude-sonnet-4-6",
    "claude-opus-4-5": "claude-opus-4-5",
    "claude-opus-4-6": "claude-opus-4-6",
    "claude-opus-4-7": "claude-opus-4-7",
}

# Empty list disables every built-in tool. Safest default for a chat
# surface — the model can't read files, run bash, or fetch URLs.
_DEFAULT_TOOLS: list[str] = []

# Single-turn chat: each user message produces exactly one assistant
# response; the SDK closes the subprocess after that turn.
_DEFAULT_MAX_TURNS = 1

# When tool use is enabled (e.g. ``exa_search``), the agent needs at
# least one extra turn to read the tool result and respond. We budget a
# few more so the model can plan → call tool → read result → maybe
# refine with a follow-up call → respond. ``error_max_turns`` surfaces
# as a ``ResultMessage(is_error=True)`` and is the symptom users see when
# this number is too low (the chat shows an error panel after a
# successful "Searched the web" indicator).
_TOOL_ENABLED_MAX_TURNS = 6

# With ``tools=[]`` no tool ever runs, so the choice here is mostly
# cosmetic. We pick "default" rather than "bypassPermissions" so that
# enabling a tool in the future fails closed instead of open.
_DEFAULT_PERMISSION_MODE: PermissionMode = "default"

# System prompt scoped to a chat product. We deliberately do NOT use
# Claude Code's default preset, which steers the model toward software
# engineering tasks and tools that don't exist in this surface.
# Provider-default system prompt: when no caller supplied one we use
# the *shared* ``app.core.agent_system_prompt.DEFAULT_AGENT_SYSTEM_PROMPT``
# so the agent's identity doesn't silently change based on which
# model the user picked.  The real prompt for chat traffic is
# assembled from SOUL.md + AGENTS.md by the chat router (PR #113);
# this constant only fires for unit tests and script-mode callers.


# ---------------------------------------------------------------------------
# Public configuration
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ClaudeLLMConfig:
    """Tunable configuration for :class:`ClaudeLLM`.

    Each field has a safe default; pass an instance to ``ClaudeLLM``
    when you need to override one (most often in tests).
    """

    tools: list[str] | None = field(default_factory=lambda: list(_DEFAULT_TOOLS))
    """Whitelist of built-in tools the agent may use. ``[]`` (default) disables every built-in tool. ``None`` falls back to the SDK / CLI defaults — only do that on a trusted machine."""

    max_turns: int = _DEFAULT_MAX_TURNS
    """Maximum number of conversation turns inside a single ``stream()`` call."""

    permission_mode: PermissionMode = _DEFAULT_PERMISSION_MODE
    """SDK permission mode. Effective only when at least one tool is enabled."""

    system_prompt: str | None = _DEFAULT_SYSTEM_PROMPT
    """System prompt sent on every turn. ``None`` falls back to the SDK default."""

    cwd: str | None = None
    """Working directory passed to the SDK. Affects where transcript files live and where tools (if any) operate. ``None`` falls back to the process cwd."""

    oauth_token: str | None = None
    """OAuth token forwarded to the CLI subprocess as ``CLAUDE_CODE_OAUTH_TOKEN``. ``None`` defers to whatever is already on the parent process's ``os.environ``."""

    extra_env: dict[str, str] = field(default_factory=dict)
    """Additional environment variables forwarded to the CLI subprocess."""


# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------


class ClaudeLLM:
    """Wraps the Claude Agent SDK for streaming chat."""

    def __init__(
        self,
        model_id: str,
        *,
        config: ClaudeLLMConfig | None = None,
        user_id: uuid.UUID | None = None,
    ) -> None:
        """Construct a Claude provider bound to a specific model slug.

        Args:
            model_id: The bare vendor slug (e.g. ``"claude-sonnet-4-6"``),
                **not** the canonical wire form. The factory calls
                :func:`parse_model_id` first and hands the unwrapped
                ``parsed.model`` slug here; ``_MODEL_MAP`` is keyed on
                bare slugs by design.
            config: Optional Claude-specific config (OAuth token,
                ``max_turns``, extra env). Defaults are read by the
                factory from ``settings``.
            user_id: App-level user UUID. When set, ``stream()`` resolves
                per-workspace API-key overrides for this user.
        """
        self._model_id = model_id
        self._config = config or ClaudeLLMConfig()
        self._user_id = user_id

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        history: list[dict[str, str]]
        | None = None,  # ignored: Claude SDK handles session continuity via `resume`
        tools: list[AgentTool] | None = None,
        system_prompt: str | None = None,
        reasoning_effort: ReasoningEffort | None = None,
        permission_check: PermissionCheckFn | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """Stream a single assistant response for ``question``.

        Args:
            question: The user message to send to Claude.
            conversation_id: App-level conversation UUID; reused as the
                Claude SDK session ID so multi-turn history is preserved
                across requests.
            user_id: App-level user UUID. Currently unused by this
                provider but kept in the protocol so future per-user
                cwd / quota logic can wire in without a signature change.
            history: Ignored — the Claude SDK manages session continuity
                natively via ``resume``. Accepted for protocol parity
                with other providers (e.g. ``GeminiLLM``).
            tools: Optional list of cross-provider :class:`AgentTool`
                instances. Bridged into a single in-process MCP server
                by ``_claude_tool_bridge`` so the SDK can call them.
            system_prompt: Optional system prompt to override the
                provider-default chat-scoped prompt. Falls back to
                :data:`DEFAULT_AGENT_SYSTEM_PROMPT` when ``None``.
            reasoning_effort: Optional reasoning-depth knob. Forwarded to
                Claude Code as ``effort`` when set.
            permission_check: Optional cross-provider ``can_use_tool``
                gate (PR 03b).  Bound into the Claude SDK's
                ``can_use_tool`` callback via
                :func:`_claude_tool_bridge.make_can_use_tool` so the
                same policy applies as the Gemini path.  ``None``
                preserves the historical namespace-only auto-approval.

        Yields:
            ``StreamEvent`` dictionaries — text/thinking deltas, tool
            events, an optional rate-limit warning, and any error events.
        """
        options = self._build_options(
            conversation_id,
            system_prompt=system_prompt,
            agent_tools=tools,
            reasoning_effort=reasoning_effort,
            permission_check=permission_check,
        )
        try:
            # The SDK requires streaming-mode input (an AsyncIterable
            # of message dicts) whenever ``can_use_tool`` is set on the
            # options.  We always emit a single user-message envelope
            # so the path is uniform regardless of whether bridged
            # tools are mounted; uniform path means one shape to test
            # and reason about.
            async for message in query(prompt=_aiter_user_prompt(question), options=options):
                for event in _events_from_message(message):
                    yield event
        except CLINotFoundError as error:
            # `exception` (not `error`) gives us the stacktrace in the
            # log — required by ruff TRY400 and useful for diagnosing
            # PATH issues that vary across machines.
            logger.exception("Claude CLI binary not found")
            yield _error_event(
                "Claude Code CLI binary is not installed in this environment. "
                "Install it with `npm i -g @anthropic-ai/claude-code` and ensure "
                "the executable is on PATH, or set ClaudeAgentOptions.cli_path. "
                f"Underlying error: {error}",
            )
        except CLIConnectionError as error:
            logger.warning("Claude CLI subprocess connection lost: %s", error)
            yield _error_event(
                f"Lost connection to the Claude Code CLI subprocess. Underlying error: {error}",
            )
        except ProcessError as error:
            exit_code = getattr(error, "exit_code", "n/a")
            stderr = getattr(error, "stderr", "")
            logger.exception(
                "Claude CLI subprocess exited: exit_code=%s stderr=%r",
                exit_code,
                stderr,
            )
            yield _error_event(
                "Claude Code CLI exited with an error. Verify CLAUDE_CODE_OAUTH_TOKEN "
                "is configured and your account has access to the requested model. "
                f"Exit code: {exit_code}. stderr: {stderr!r}",
            )
        except CLIJSONDecodeError:
            logger.exception("Claude CLI returned non-JSON message")
            yield _error_event("Failed to parse a JSON message from the Claude Code CLI.")
        except ClaudeSDKError as error:
            # `exception` (not `error`) so the traceback lands in the log
            # — broad SDK errors are the bucket where new failure modes
            # show up, and a stacktrace is the only way to attribute them.
            logger.exception("Claude SDK error during stream")
            yield _error_event(f"Claude SDK error: {error}")

    # -- internal --------------------------------------------------------

    def _build_options(
        self,
        conversation_id: uuid.UUID,
        *,
        system_prompt: str | None = None,
        agent_tools: list[AgentTool] | None = None,
        reasoning_effort: ReasoningEffort | None = None,
        permission_check: PermissionCheckFn | None = None,
    ) -> ClaudeAgentOptions:
        """Build per-request options, picking ``session_id`` vs ``resume``.

        Args:
            conversation_id: App-level conversation UUID; reused as the
                Claude SDK session id.
            system_prompt: Optional per-call override.  When provided,
                takes precedence over ``self._config.system_prompt`` so
                the chat router can inject app-assembled context (e.g.
                workspace AGENTS.md per PR #113).
            agent_tools: Cross-provider :class:`AgentTool` list assembled
                by the chat router.  Translated into a single in-process
                MCP server via
                :mod:`app.core.providers._claude_tool_bridge` and mounted
                under ``ClaudeAgentOptions.mcp_servers``; the matching
                ``mcp__ai_nexus__<name>`` IDs are appended to the
                allowed-tools whitelist so the SDK actually permits
            permission_check: Optional cross-provider permission gate.
                When supplied, bound into ``ClaudeAgentOptions.can_use_tool``
                via :func:`_claude_tool_bridge.make_can_use_tool` so the
                SDK enforces the same policy as the Gemini path.
                execution.
            reasoning_effort: Optional per-turn reasoning-depth knob.
        """
        session_id = str(conversation_id)

        # Local tool whitelist for the Claude SDK's built-in CLI tools
        # (read/write filesystem, etc.).  Distinct from ``agent_tools``
        # — those are app-defined tools we bridge into an MCP server.
        local_tools = list(self._config.tools) if self._config.tools is not None else None
        mcp_servers: dict[str, Any] = {}

        # Bridge the cross-provider AgentTool list into a single MCP
        # server.  All app-defined tools (workspace files, web search,
        # …) flow through here — the provider doesn't know which ones
        # are in the list and shouldn't.
        local_tools = _merge_agent_tools_into_whitelist(
            local_tools, list(agent_tools or []), mcp_servers
        )

        # If tool use is enabled but the caller didn't override
        # ``max_turns``, automatically widen the turn budget so the agent
        # can read its own tool result. Without this the very first
        # tool invocation hits the SDK's ``error_max_turns`` and surfaces
        # in chat as a "Claude SDK result reported an error" panel
        # immediately after the "Searched the web" indicator.
        effective_max_turns = self._config.max_turns
        tool_use_enabled = bool(local_tools) or bool(mcp_servers)
        if tool_use_enabled and effective_max_turns <= _DEFAULT_MAX_TURNS:
            effective_max_turns = _TOOL_ENABLED_MAX_TURNS

        # System prompt resolution: per-call value (from the chat router /
        # AGENTS.md loader) wins over ``self._config.system_prompt``.
        effective_system_prompt = system_prompt or self._config.system_prompt

        kwargs: dict[str, Any] = {
            "model": _resolve_sdk_model(self._model_id),
            "tools": local_tools,
            "max_turns": effective_max_turns,
            "permission_mode": self._config.permission_mode,
            "system_prompt": effective_system_prompt,
            # Don't inherit user/project filesystem settings on a server.
            "setting_sources": [],
        }
        if reasoning_effort is not None:
            kwargs["effort"] = "max" if reasoning_effort == "extra-high" else reasoning_effort
        # Per-request cost cap (PR 04). The Claude SDK enforces this
        # natively — when the agent burns past ``max_budget_usd`` mid-turn,
        # the SDK terminates with a ``ResultMessage(is_error=True,
        # subtype="error_max_budget")``. Zero / negative disables (the
        # SDK treats it as unlimited), so a deployment that doesn't want
        # the cap can leave ``cost_max_per_request_usd=0``.
        if _settings.cost_tracker_enabled and _settings.cost_max_per_request_usd > 0:
            kwargs["max_budget_usd"] = _settings.cost_max_per_request_usd
        if mcp_servers:
            kwargs["mcp_servers"] = mcp_servers
            # ``can_use_tool`` is the SDK's per-call permission hook.
            # When the chat router supplies a cross-provider
            # ``permission_check`` (PR 03b), we delegate to it so
            # Claude and Gemini enforce the same policy.  Without
            # one, the bridge falls back to namespace-only approval
            # (the historical behaviour from PR #131).  Either way
            # the whitelist on ``tools=`` is necessary but not
            # sufficient — without ``can_use_tool`` the SDK blocks
            # every custom MCP tool call.
            kwargs["can_use_tool"] = make_can_use_tool(permission_check)
        if self._config.cwd is not None:
            kwargs["cwd"] = self._config.cwd

        env = self._build_env()
        if env:
            kwargs["env"] = env

        # First turn: seed a brand-new SDK session that uses the same UUID
        # as our conversation. Subsequent turns: resume it.
        if _session_exists(session_id, self._config.cwd):
            kwargs["resume"] = session_id
        else:
            kwargs["session_id"] = session_id

        return ClaudeAgentOptions(**kwargs)

    def _build_env(self) -> dict[str, str]:
        """Compose the env dict forwarded to the CLI subprocess."""
        env: dict[str, str] = dict(self._config.extra_env)
        if self._user_id:
            token = resolve_api_key(self._user_id, "CLAUDE_CODE_OAUTH_TOKEN")
            if token:
                env["CLAUDE_CODE_OAUTH_TOKEN"] = token
        elif self._config.oauth_token:
            env["CLAUDE_CODE_OAUTH_TOKEN"] = self._config.oauth_token
        return env


# ---------------------------------------------------------------------------
# Module-level helpers (also unit-tested directly).
# ---------------------------------------------------------------------------


def _merge_agent_tools_into_whitelist(
    local_tools: list[str] | None,
    agent_tool_list: list[AgentTool],
    mcp_servers: dict[str, Any],
) -> list[str] | None:
    """Mount *agent_tool_list* as an MCP server and append its IDs to *local_tools*.

    Mutates *mcp_servers* in place (adding the bridge server when there
    is at least one tool) and returns the updated *local_tools* whitelist.
    Extracted from :meth:`ClaudeLLM._build_options` so the body stays under
    the project nesting budget.
    """
    if not agent_tool_list:
        return local_tools
    server = build_mcp_server(agent_tool_list)
    if server is not None:
        mcp_servers[AGENT_TOOL_MCP_SERVER_NAME] = server
    allowed = allowed_tool_ids(agent_tool_list)
    if local_tools is None:
        return list(allowed)
    deduped = list(local_tools)
    for tid in allowed:
        if tid not in deduped:
            deduped.append(tid)
    return deduped


async def _aiter_user_prompt(question: str) -> AsyncIterator[dict[str, Any]]:
    """Wrap a single user message as the streaming-mode input the SDK expects.

    The Claude SDK accepts either a plain string *or* an
    ``AsyncIterable[dict]`` for the ``prompt`` arg, but enforces the
    streaming-mode shape whenever a permission hook (``can_use_tool``)
    is registered — which we now always do via the bridge.  Yielding
    one envelope keeps every call site uniform regardless of whether
    tools were mounted on this turn.
    """
    yield {
        "type": "user",
        "message": {"role": "user", "content": question},
    }


def _resolve_sdk_model(model_id: str) -> str:
    """Map frontend model ID to Claude SDK model string.

    Falls back to passing ``model_id`` through unchanged when no explicit
    mapping is registered — the Claude SDK accepts API model IDs directly.
    """
    return _MODEL_MAP.get(model_id, model_id)


def _session_exists(session_id: str, directory: str | None) -> bool:
    """Best-effort probe for an existing Claude SDK transcript.

    A failure to probe (filesystem error, malformed UUID, ...) is treated
    as "no existing session": the next call will pass ``session_id`` and
    the SDK will create a new transcript at that ID. This is the safer
    fallback — passing ``resume`` for a session that doesn't exist would
    be a hard failure.
    """
    try:
        return get_session_info(session_id, directory=directory) is not None
    except Exception as error:
        logger.warning(
            "Probing Claude session %s failed; assuming it does not exist (%s)",
            session_id,
            error,
        )
        return False


# Event-translation helpers live in ``_claude_events`` so this file
# stays under the 500-line gate.  Re-exported here because the existing
# tests + provider code import them from this module — keeping the
# import surface stable means the split is internal-only. Late import is
# intentional: it must follow the class definitions above so the module
# graph round-trips without a circular reference; ruff's E402 doesn't
# express this constraint, so it's silenced explicitly.
from ._claude_events import (  # noqa: E402  (deliberate post-class re-export)
    _error_event,
    _events_from_assistant,
    _events_from_message,
    _tool_result_event,
    _tool_result_to_text,
)

__all__ = [
    "ClaudeLLM",
    "ClaudeLLMConfig",
    "_error_event",
    "_events_from_assistant",
    "_events_from_message",
    "_tool_result_event",
    "_tool_result_to_text",
]
