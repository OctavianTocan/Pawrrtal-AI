"""Claude Agent SDK ``query`` iteration for :class:`ClaudeLLM` streaming."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Iterator
from typing import Any

from claude_agent_sdk import ClaudeAgentOptions, query
from sigil_sdk import with_conversation_id

from app.core.providers._claude_events import _events_from_message
from app.core.providers.base import StreamEvent
from app.core.providers.claude_sdk_input import aiter_claude_sdk_user_prompt
from app.core.telemetry.sigil_claude import (
    ClaudeSigilAccum,
    apply_claude_stream_event_for_sigil,
)


def _events_for_sdk_message(
    message: object,
    sigil_rec: Any | None,
    first_mark: list[bool],
    accum: ClaudeSigilAccum,
) -> Iterator[StreamEvent]:
    """Project one SDK message to :class:`StreamEvent` values (Sigil side effects)."""
    for event in _events_from_message(message):
        if sigil_rec is not None:
            apply_claude_stream_event_for_sigil(
                event,
                sigil_rec,
                first_mark=first_mark,
                accum=accum,
            )
        yield event


async def iter_claude_query_stream(
    question: str,
    options: ClaudeAgentOptions,
    conversation_id: uuid.UUID,
    sigil_rec: Any | None,
    first_mark: list[bool],
    accum: ClaudeSigilAccum,
) -> AsyncIterator[StreamEvent]:
    """Drive ``claude_agent_sdk.query`` and yield :class:`StreamEvent` values."""
    with with_conversation_id(str(conversation_id)):
        async for message in query(
            prompt=aiter_claude_sdk_user_prompt(question),
            options=options,
        ):
            for event in _events_for_sdk_message(message, sigil_rec, first_mark, accum):
                yield event
