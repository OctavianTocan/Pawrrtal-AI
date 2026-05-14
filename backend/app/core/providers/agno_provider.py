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
        """Construct an Agno provider bound to a specific model slug.

        Args:
            model_id: The bare vendor slug (e.g. ``"gemini-3-flash-preview"``),
                **not** the canonical wire form. The factory calls
                :func:`parse_model_id` first and hands the unwrapped
                ``parsed.model`` slug here.
        """
        self._model_id = model_id

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AsyncIterator[StreamEvent]:
        """Stream Agno response chunks as ``delta`` events.

        Agno's ``agent.run(stream=True)`` is synchronous, so the iteration runs
        in a worker thread (``anyio.to_thread``) to avoid blocking the event loop.
        """
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
