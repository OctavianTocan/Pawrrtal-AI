"""Base protocol for AI providers."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any, Protocol, TypedDict


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


class AIProvider(Protocol):
    """Unified streaming interface for all AI providers.

    Both Gemini (via Agno) and Claude (via Claude Agent SDK) implement this.
    The chat endpoint only depends on this protocol — never on a concrete class.
    """

    def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AsyncIterator[StreamEvent]:
        """Stream response events for a user message.

        Implementations are async generators (``async def`` + ``yield``).
        The protocol declares the call signature with a plain ``def`` so
        mypy treats ``provider.stream(...)`` as returning the async
        iterator directly — declaring it ``async def`` would imply a
        coroutine that *returns* an iterator, requiring callers to
        ``await`` first, which is not what the runtime contract is.
        """
        ...
