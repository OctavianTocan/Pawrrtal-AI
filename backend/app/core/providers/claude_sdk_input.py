"""Streaming-mode user prompt envelope for the Claude Agent SDK."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any


async def aiter_claude_sdk_user_prompt(question: str) -> AsyncIterator[dict[str, Any]]:
    """Yield a single user-message envelope (required when ``can_use_tool`` is set)."""
    yield {
        "type": "user",
        "message": {"role": "user", "content": question},
    }
