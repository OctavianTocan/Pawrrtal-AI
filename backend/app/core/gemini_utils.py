"""Lightweight Gemini helpers for one-off, non-streaming calls."""

from __future__ import annotations

from google import genai
from google.genai import types

from app.core.config import settings

_DEFAULT_MODEL = "gemini-2.0-flash"


class _GeminiClientHolder:
    """Process-wide lazy Gemini client (avoids a module-level ``global``)."""

    _client: genai.Client | None = None

    @classmethod
    def get(cls) -> genai.Client:
        if cls._client is None:
            cls._client = genai.Client(api_key=settings.google_api_key)
        return cls._client


def _get_client() -> genai.Client:
    """Return a shared Gemini client, creating it on first call."""
    return _GeminiClientHolder.get()


async def generate_text_once(prompt: str, model_id: str = _DEFAULT_MODEL) -> str:
    """Send a single prompt to Gemini and return the text response.

    Used for short utility tasks such as title generation.  Raises on
    API errors so the caller can decide how to handle them.
    """
    client = _get_client()
    response = await client.aio.models.generate_content(
        model=model_id,
        contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
    )
    return (response.text or "").strip()
