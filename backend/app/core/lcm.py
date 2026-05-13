"""Lossless Context Management — ingest and assembly (PR #2: fresh tail only).

This module is the primary code-path entry point for LCM.  All public
functions are always importable; callers gate on ``settings.lcm_enabled``
before calling them (or pass the flag explicitly in tests).

PR #2 scope
-----------
*   ``ingest_message`` — record every new ChatMessage in ``lcm_context_items``
    so that the assembled list mirrors the full message sequence.
*   ``assemble_context`` — return the context window for a conversation turn
    by reading ``lcm_context_items`` in ordinal order, fetching the backing
    ChatMessage rows, and returning a list of ``{"role", "content"}`` dicts.

Only ``item_kind="message"`` items exist at this stage.
``item_kind="summary"`` support (for compacted nodes) is added in PR #3.

Design note
-----------
Reading context via ``lcm_context_items`` rather than a raw
``LIMIT fresh_tail_count`` on ``chat_messages`` is the main structural
change in this PR.  The call site in ``chat.py`` looks identical, but now
the assembly walks the context list — which PR #3 can rewrite in place with
summary rows — rather than a simple ordered-message query.  The compaction
PR therefore has zero blast radius on the assembly call site.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ChatMessage, LCMContextItem, LCMSummary


async def ingest_message(
    session: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
) -> LCMContextItem:
    """Append a ChatMessage to the conversation's ``lcm_context_items`` list.

    Creates one :class:`~app.models.LCMContextItem` row with
    ``item_kind="message"`` pointing at ``message_id``.  The ordinal is the
    next free slot (``max(ordinal) + 1`` for the conversation, or ``0`` for
    the very first message).

    The caller must flush/commit the session after this call.  The function
    itself calls ``session.flush()`` so the new row's ``id`` is populated
    before returning.

    Args:
        session: Open async database session.
        conversation_id: The conversation this message belongs to.
        message_id: The :class:`~app.models.ChatMessage` ``id`` to record.

    Returns:
        The freshly inserted :class:`~app.models.LCMContextItem`.
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

    **PR #2 — fresh tail only.**  Fetches the last ``fresh_tail_count``
    entries from ``lcm_context_items`` (ordered by ``ordinal`` DESC, then
    reversed to restore ascending order), resolves each
    ``item_kind="message"`` entry to its :class:`~app.models.ChatMessage`
    row in a single batch query, and returns a list of
    ``{"role": ..., "content": ...}`` dicts filtered to ``user`` /
    ``assistant`` roles.

    PR #3 (leaf compaction) will insert ``item_kind="summary"`` rows into
    ``lcm_context_items`` as a in-place replacement for message ranges.
    When that happens, this function only needs a new branch for
    ``item_kind="summary"`` that fetches :class:`~app.models.LCMSummary`
    content and injects it as a ``{"role": "assistant", "content":
    summary.content}`` entry (or a dedicated ``system`` role — TBD).  The
    chat-router call site does not change.

    Args:
        session: Open async database session.
        conversation_id: Conversation whose context to assemble.
        fresh_tail_count: Maximum number of context-list items to return.
            Matches ``settings.lcm_fresh_tail_count`` in production.

    Returns:
        List of ``{"role": str, "content": str}`` dicts in ascending ordinal
        order (oldest first), ready to be passed directly to a provider's
        ``history`` parameter.  Returns an empty list if no items exist yet.
    """
    # DESC + LIMIT to get the tail cheaply, then reverse so callers receive
    # messages in chronological order.
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

    # ------------------------------------------------------------------
    # PR #2: only "message" items exist; "summary" branch added in PR #3.
    # ------------------------------------------------------------------
    message_ids = [item.item_id for item in items if item.item_kind == "message"]

    if not message_ids:
        return []

    # One round-trip for all backing rows.
    msg_result = await session.execute(
        select(ChatMessage).where(ChatMessage.id.in_(message_ids))
    )
    messages_by_id: dict[uuid.UUID, ChatMessage] = {
        m.id: m for m in msg_result.scalars().all()
    }

    context: list[dict[str, Any]] = []
    for item in items:
        if item.item_kind == "message":
            msg = messages_by_id.get(item.item_id)
            if msg is not None and msg.role in {"user", "assistant"}:
                context.append({"role": msg.role, "content": msg.content or ""})
    return context
