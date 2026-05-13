"""Lossless Context Management — ingest and assembly.

Public API
----------
``ingest_message``   — record a new ChatMessage in lcm_context_items
``assemble_context`` — build the [{role, content}] context list for a turn

All functions are always importable; callers gate on ``settings.lcm_enabled``
(default ``False``) before invoking them.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ChatMessage, LCMContextItem, LCMSummary

_log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def ingest_message(
    session: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
) -> LCMContextItem:
    """Append a ChatMessage to the conversation's ``lcm_context_items`` list.

    Creates one :class:`~app.models.LCMContextItem` row with
    ``item_kind="message"`` at the next free ordinal slot
    (``max(ordinal) + 1`` for the conversation, or ``0`` for the very first
    message).

    The caller must commit the session after this call; the function calls
    ``session.flush()`` so the new row's ``id`` is populated before returning.
    """
    result = await session.execute(
        select(func.max(LCMContextItem.ordinal)).where(
            LCMContextItem.conversation_id == conversation_id
        )
    )
    current_max = result.scalar()
    next_ordinal = 0 if current_max is None else current_max + 1

    item = LCMContextItem(
        conversation_id=conversation_id,
        ordinal=next_ordinal,
        item_kind="message",
        item_id=message_id,
    )
    session.add(item)
    await session.flush()
    return item


async def assemble_context(
    session: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    fresh_tail_count: int,
) -> list[dict[str, Any]]:
    """Return the assembled context window for a conversation turn.

    Fetches the last ``fresh_tail_count`` entries from ``lcm_context_items``
    (DESC + LIMIT, then reversed to chronological order), resolves each entry
    to its backing row, and returns a list of ``{"role": ..., "content": ...}``
    dicts ready to pass to a provider's ``history`` parameter.

    Item-kind handling:

    * ``"message"`` — resolved to its :class:`~app.models.ChatMessage`; only
      ``user`` and ``assistant`` roles are included.
    * ``"summary"`` — resolved to its :class:`~app.models.LCMSummary` and
      injected as a synthetic ``user`` message with a
      ``[Summary of earlier conversation]`` prefix so both the model and human
      readers recognise it as compacted history rather than a real turn.

    Returns an empty list if no items exist yet.
    """
    result = await session.execute(
        select(LCMContextItem)
        .where(LCMContextItem.conversation_id == conversation_id)
        .order_by(LCMContextItem.ordinal.desc())
        .limit(fresh_tail_count)
    )
    items = list(result.scalars().all())
    items.reverse()  # oldest first

    if not items:
        return []

    message_ids = [item.item_id for item in items if item.item_kind == "message"]
    summary_ids = [item.item_id for item in items if item.item_kind == "summary"]

    messages_by_id: dict[uuid.UUID, ChatMessage] = {}
    if message_ids:
        msg_result = await session.execute(
            select(ChatMessage).where(ChatMessage.id.in_(message_ids))
        )
        messages_by_id = {m.id: m for m in msg_result.scalars().all()}

    summaries_by_id: dict[uuid.UUID, LCMSummary] = {}
    if summary_ids:
        sum_result = await session.execute(
            select(LCMSummary).where(LCMSummary.id.in_(summary_ids))
        )
        summaries_by_id = {s.id: s for s in sum_result.scalars().all()}

    context: list[dict[str, Any]] = []
    for item in items:
        if item.item_kind == "message":
            msg = messages_by_id.get(item.item_id)
            if msg is not None and msg.role in {"user", "assistant"}:
                context.append({"role": msg.role, "content": msg.content or ""})
        elif item.item_kind == "summary":
            summary = summaries_by_id.get(item.item_id)
            if summary is not None:
                context.append(
                    {
                        "role": "user",
                        "content": f"[Summary of earlier conversation]\n{summary.content}",
                    }
                )
    return context
