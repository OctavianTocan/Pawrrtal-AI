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
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass, field
from typing import Any

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKError,
    CLIConnectionError,
    CLIJSONDecodeError,
    CLINotFoundError,
    PermissionMode,
    ProcessError,
    RateLimitEvent,
    ResultMessage,
    SystemMessage,
    TextBlock,
    ThinkingBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    get_session_info,
    query,
)

from app.core.tools.exa_search_claude import (
    CLAUDE_TOOL_ID as EXA_CLAUDE_TOOL_ID,
)
from app.core.tools.exa_search_claude import (
    MCP_SERVER_NAME as EXA_MCP_SERVER_NAME,
)
from app.core.tools.exa_search_claude import (
    build_exa_mcp_server,
)

from .base import StreamEvent

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
_DEFAULT_SYSTEM_PROMPT = (
    "You are the Claude assistant inside the AI Nexus chat application. "
    "You are speaking with the user via a text chat surface. Be concise, "
    "helpful, and accurate. You do NOT have file system or shell access "
    "in this surface — decline politely if the user asks you to perform "
    "such actions.\n\n"
    "Web search is available via the `exa_search` tool (powered by Exa). "
    "Call it whenever the user asks for fresh information, current events, "
    "citations, or anything beyond your training data. Always cite the "
    "URLs returned by the tool when you use the results."
)


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

    enable_exa_search: bool = False
    """When ``True``, mount the in-process Exa MCP server and whitelist the ``exa_search`` tool. Toggled by the factory based on whether ``EXA_API_KEY`` is configured."""


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
    ) -> None:
        self._model_id = model_id
        self._config = config or ClaudeLLMConfig()

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        history: list[dict[str, str]]
        | None = None,  # ignored: Claude SDK handles session continuity via `resume`
        tools: object | None = None,  # ignored for now: see note in stream() body
        system_prompt: str | None = None,
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

        Yields:
            ``StreamEvent`` dictionaries — text/thinking deltas, tool
            events, an optional rate-limit warning, and any error events.
        """
        del user_id  # reserved for future per-user routing
        options = self._build_options(
            conversation_id,
            system_prompt=system_prompt,
            agent_tools=tools,
        )
        try:
            async for message in query(prompt=question, options=options):
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
            yield _error_event(
                "Failed to parse a JSON message from the Claude Code CLI."
            )
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
        agent_tools: object | None = None,
    ) -> ClaudeAgentOptions:
        """Build per-request options, picking ``session_id`` vs ``resume``.

        Args:
            conversation_id: App-level conversation UUID; reused as the
                Claude SDK session id.
            system_prompt: Optional per-call override.  When provided,
                takes precedence over ``self._config.system_prompt`` so
                the chat router can inject app-assembled context (e.g.
                workspace AGENTS.md per PR #113).
            agent_tools: AgentTool list from the cross-provider agent loop
                signature.  Currently unused — the Claude SDK runs its
                own tool surface and AgentTool wiring requires an MCP
                bridge that's tracked separately.  Accepted here so the
                provider protocol signature stays consistent.
        """
        _ = agent_tools  # see docstring
        session_id = str(conversation_id)

        # Local tool whitelist for the Claude SDK (built-in CLI tools).
        # Renamed off the bare ``tools`` name so the parameter shadowing is
        # explicit — see comment below about the AgentTool ``tools`` arg.
        local_tools = list(self._config.tools) if self._config.tools is not None else None
        mcp_servers: dict[str, Any] = {}
        if self._config.enable_exa_search:
            if local_tools is None:
                local_tools = [EXA_CLAUDE_TOOL_ID]
            elif EXA_CLAUDE_TOOL_ID not in local_tools:
                local_tools.append(EXA_CLAUDE_TOOL_ID)
            mcp_servers[EXA_MCP_SERVER_NAME] = build_exa_mcp_server()

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
        if mcp_servers:
            kwargs["mcp_servers"] = mcp_servers
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
        token = self._config.oauth_token
        if token:
            env["CLAUDE_CODE_OAUTH_TOKEN"] = token
        return env


# ---------------------------------------------------------------------------
# Module-level helpers (also unit-tested directly).
# ---------------------------------------------------------------------------


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


def _events_from_message(message: Any) -> Iterator[StreamEvent]:
    """Translate a single Claude SDK ``Message`` into zero or more ``StreamEvent``s."""
    if isinstance(message, AssistantMessage):
        yield from _events_from_assistant(message)
        return
    if isinstance(message, UserMessage):
        # ``UserMessage`` in the stream represents tool results being fed
        # back to the model. Surface those so the frontend can render the
        # tool roundtrip; ignore plain echoes.
        if isinstance(message.content, list):
            for block in message.content:
                if isinstance(block, ToolResultBlock):
                    yield _tool_result_event(block)
        return
    if isinstance(message, ResultMessage):
        if message.is_error:
            # Log alongside yielding so the failure shows up in
            # `backend/app.log` too. Previously the only signal was the
            # SSE error panel in the browser, which made tool failures
            # like ``error_max_turns`` invisible to anyone reading
            # backend logs to debug. Logged at WARNING because the
            # connection is still alive — the chat surface recovers and
            # the user can retry.
            logger.warning(
                "Claude SDK ResultMessage reported error: "
                "stop_reason=%r subtype=%r duration_ms=%s num_turns=%s",
                message.stop_reason,
                message.subtype,
                getattr(message, "duration_ms", None),
                getattr(message, "num_turns", None),
            )
            yield _error_event(
                "Claude SDK result reported an error. "
                f"stop_reason={message.stop_reason!r} subtype={message.subtype!r}"
            )
        return
    if isinstance(message, RateLimitEvent):
        info = message.rate_limit_info
        if info.status == "rejected":
            yield _error_event("Claude API rate limit reached. Please wait and retry.")
        return
    if isinstance(message, SystemMessage):
        # System messages carry CLI metadata (init details, mirror errors,
        # task progress, etc.). Not user-visible by default.
        return


def _events_from_assistant(message: AssistantMessage) -> Iterator[StreamEvent]:
    """Project an assistant message's content blocks into ``StreamEvent``s."""
    for block in message.content:
        if isinstance(block, TextBlock):
            yield StreamEvent(type="delta", content=block.text)
        elif isinstance(block, ThinkingBlock):
            yield StreamEvent(type="thinking", content=block.thinking)
        elif isinstance(block, ToolUseBlock):
            yield StreamEvent(
                type="tool_use",
                name=block.name,
                input=block.input,
                tool_use_id=block.id,
            )
        elif isinstance(block, ToolResultBlock):
            yield _tool_result_event(block)
    if message.error:
        yield _error_event(f"Assistant message reported an error: {message.error}")


def _tool_result_event(block: ToolResultBlock) -> StreamEvent:
    return StreamEvent(
        type="tool_result",
        tool_use_id=block.tool_use_id,
        content=_tool_result_to_text(block.content),
    )


def _tool_result_to_text(content: object) -> str:
    """Render ``ToolResultBlock.content`` as plain text for the SSE event."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                # Anthropic's tool-result format uses ``{"type": "text", "text": "..."}``.
                if item.get("type") == "text" and isinstance(item.get("text"), str):
                    parts.append(item["text"])
                else:
                    parts.append(str(item))
            else:
                parts.append(str(item))
        return "\n".join(parts)
    return str(content)


def _error_event(message: str) -> StreamEvent:
    return StreamEvent(type="error", content=message)
