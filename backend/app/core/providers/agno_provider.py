"""Agno-backed AI provider (Gemini and other Agno-supported models)."""
from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import anyio

from app.core.agents import create_agent
from .base import StreamEvent


class AgnoProvider:
    """Wraps the Agno agent framework for streaming."""

    def __init__(self, model_id: str) -> None:
        self._model_id = model_id

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AsyncIterator[StreamEvent]:
        agent = create_agent(user_id, conversation_id, self._model_id)

        def _collect() -> list[str]:
            results: list[str] = []
            for ev in agent.run(question, stream=True):
                chunk = getattr(ev, "content", None)
                if chunk:
                    results.append(str(chunk))
            return results

        chunks = await anyio.to_thread.run_sync(_collect)
        for chunk in chunks:
            yield StreamEvent(type="delta", content=chunk)
