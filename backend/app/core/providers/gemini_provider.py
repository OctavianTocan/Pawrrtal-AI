"""Direct Google GenAI provider — real streaming, manual history."""
from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

from google import genai
from google.genai import types

from app.core.config import settings
from .base import AIProvider, StreamEvent

_SYSTEM_PROMPT = (
    "You are a helpful AI assistant. "
    "Be concise, accurate, and thoughtful in your responses."
)

# Roles Gemini understands.
_ROLE_MAP = {"user": "user", "assistant": "model"}


def _build_contents(
    history: list[dict[str, str]],
    question: str,
) -> list[types.Content]:
    """Convert stored message history + current question into Gemini Contents.

    Only user/assistant messages are included.  The current user question is
    appended at the end so the model sees it as the latest turn.
    """
    contents: list[types.Content] = []

    for msg in history:
        role = _ROLE_MAP.get(msg.get("role", ""), "")
        text = msg.get("content", "").strip()
        if role and text:
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=text)],
                )
            )

    # Append the current user question as the final turn.
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=question)],
        )
    )

    return contents


class GeminiProvider:
    """Streams Gemini responses using the Google GenAI SDK directly.

    History is supplied by the caller (read from our Message table in
    chat.py) so this class has zero framework dependencies — no Agno,
    no external state store.
    """

    def __init__(self, model_id: str) -> None:
        self._model_id = model_id
        self._client = genai.Client(api_key=settings.google_api_key)

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        history: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """Yield StreamEvents for the given question.

        Args:
            question: The current user message.
            conversation_id: Used for logging / future tool routing.
            user_id: Used for logging / future per-user config.
            history: Recent messages ``[{"role": "user"|"assistant", "content": str}]``
                     oldest first.  Pass ``None`` or ``[]`` for a fresh conversation.
        """
        contents = _build_contents(history or [], question)
        config = types.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
        )

        try:
            async for chunk in self._client.aio.models.generate_content_stream(
                model=self._model_id,
                contents=contents,
                config=config,
            ):
                text = chunk.text
                if text:
                    yield StreamEvent(type="delta", content=text)
        except Exception as exc:
            yield StreamEvent(
                type="error",
                content=f"Gemini provider error: {exc}",
            )
