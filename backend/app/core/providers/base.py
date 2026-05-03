"""Base protocol for AI providers."""
from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any, Protocol, TypedDict


class StreamEvent(TypedDict, total=False):
    type: str           # "delta" | "thinking" | "tool_use" | "tool_result"
    content: str        # for delta and thinking
    name: str           # for tool_use
    input: dict[str, Any]   # for tool_use
    tool_use_id: str    # for tool_result


class AIProvider(Protocol):
    """Unified streaming interface for all AI providers.

    Both Gemini (via Agno) and Claude (via Claude Agent SDK) implement this.
    The chat endpoint only depends on this protocol — never on a concrete class.
    """

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AsyncIterator[StreamEvent]:
        """Stream response events for a user message."""
        ...
