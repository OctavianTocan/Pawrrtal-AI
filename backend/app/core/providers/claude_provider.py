"""Claude Agent SDK provider."""
from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    TextBlock,
    ThinkingBlock,
    query,
)

from .base import StreamEvent

# Map our frontend model IDs to Claude SDK model strings.
# Adjust these once official aliases are confirmed.
_MODEL_MAP: dict[str, str] = {
    "claude-sonnet-4-6": "claude-sonnet-4-5",
    "claude-opus-4-7": "claude-opus-4-5",
    "claude-haiku-4-5": "claude-haiku-4-5",
}


def _resolve_sdk_model(model_id: str) -> str:
    """Map frontend model ID to Claude SDK model string."""
    return _MODEL_MAP.get(model_id, model_id)


class ClaudeProvider:
    """Wraps the Claude Agent SDK for streaming chat."""

    def __init__(self, model_id: str) -> None:
        self._model_id = model_id

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AsyncIterator[StreamEvent]:
        options = ClaudeAgentOptions(
            model=_resolve_sdk_model(self._model_id),
            # ``resume`` loads conversation history for the given session ID,
            # allowing multi-turn continuity across requests.
            resume=str(conversation_id),
            max_turns=1,
            permission_mode="bypassPermissions",
        )

        async for message in query(prompt=question, options=options):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        yield StreamEvent(type="delta", content=block.text)
                    elif isinstance(block, ThinkingBlock):
                        yield StreamEvent(type="thinking", content=block.thinking)
