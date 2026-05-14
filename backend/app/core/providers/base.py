"""Base protocol for AI providers."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING, Any, Literal, Protocol, TypedDict

if TYPE_CHECKING:
    from app.core.agent_loop.types import AgentTool


# Discrete reasoning-effort levels carried in :meth:`AILLM.stream`.  Models
# without extended thinking ignore this argument; thinking-capable models
# translate it into their SDK's effort knob (Claude SDK ``effort`` field).
ReasoningEffort = Literal["low", "medium", "high", "max"]


class StreamEvent(TypedDict, total=False):
    """A single event yielded from an AI provider's streaming response.

    All fields are optional because each event type only carries the keys
    relevant to it (e.g. ``delta`` carries ``content`` only, ``tool_use``
    carries ``name`` + ``input``).
    """

    type: str  # "delta" | "thinking" | "tool_use" | "tool_result" | "error"
    content: str  # for delta and thinking
    name: str  # for tool_use
    input: dict[str, Any]  # for tool_use
    tool_use_id: str  # for tool_result


class AILLM(Protocol):
    """Unified streaming interface for all AI providers.

    GeminiLLM uses ``history`` (read from our Message table) to build
    multi-turn context.  ClaudeLLM manages its own session continuity
    via ``resume`` and can ignore ``history``.
    """

    def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        history: list[dict[str, str]] | None = None,
        tools: list[AgentTool] | None = None,
        system_prompt: str | None = None,
        reasoning_effort: ReasoningEffort | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """Stream response events for a user message.

        Implementations are async generators (``async def`` + ``yield``).
        The protocol declares the call signature with a plain ``def`` so
        mypy treats ``provider.stream(...)`` as returning the async
        iterator directly — declaring it ``async def`` would imply a
        coroutine that *returns* an iterator, requiring callers to
        ``await`` first, which is not what the runtime contract is.

        Args:
            question: Current user message.
            conversation_id: Conversation UUID (used for session continuity).
            user_id: Authenticated user UUID.
            history: Optional list of prior messages oldest-first, each a
                     dict with ``role`` (``"user"``/``"assistant"``) and
                     ``content`` keys.  Providers that manage their own
                     history (e.g. ClaudeLLM via ``resume``) may ignore
                     this.
            tools: Optional workspace-scoped AgentTools (read_file, write_file,
                     list_dir) to make available this turn.  Providers that
                     manage their own tool surface (e.g. ClaudeLLM) may ignore
                     this parameter.
            system_prompt: Optional override for the provider's default system
                     prompt.  When ``None`` the provider uses its own default.
            reasoning_effort: Discrete thinking budget the caller selected.
                     Providers without extended thinking (Gemini Flash today)
                     are free to ignore this; thinking-capable providers
                     translate it into their SDK's effort knob.  ``None``
                     means "use the provider's own default", which on
                     adaptive-thinking models is the catalog entry's
                     ``default_reasoning``.
        """
        ...
