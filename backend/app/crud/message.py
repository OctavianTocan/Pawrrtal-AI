"""
CRUD helpers for Message, ContextItem, and Summary models.

Every public function enforces the invariant that a ``Message`` row is
always accompanied by a matching ``ContextItem`` row in the same flush.
This keeps the context window table authoritative: the context assembler
(Phase 2) only needs to read ``context_items`` to reconstruct history —
it never has to join or guess at message ordering.

Caller contract
---------------
- Pass an uncommitted ``AsyncSession``.  Functions call ``flush()`` but
  **never** ``commit()``.  The caller is responsible for committing after
  all related side-effects (e.g. updating the conversation's
  ``updated_at``) have been applied.
- ``user_id`` should be ``None`` for assistant/system messages.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ContextItem, Message, Summary


async def get_next_ordinal(db: AsyncSession, conversation_id: uuid.UUID) -> int:
    """Return the next monotonically-increasing ordinal for a conversation.

    Ordinals start at 0.  When the conversation has no messages yet,
    ``MAX(ordinal)`` is ``NULL``; ``COALESCE`` maps that to ``-1`` so the
    first message gets ordinal ``0``.

    Args:
        db: Async database session (read-only — no flush or commit).
        conversation_id: UUID of the conversation to query.

    Returns:
        An integer one greater than the current maximum ordinal, or ``0``
        if the conversation contains no messages yet.
    """
    result = await db.execute(
        select(func.coalesce(func.max(Message.ordinal), -1)).where(
            Message.conversation_id == conversation_id
        )
    )
    # scalar() returns None when the row set is empty, but COALESCE above
    # guarantees at least -1, so the `or -1` guard is purely defensive.
    return (result.scalar() or -1) + 1


async def create_message(
    db: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID | None,
    role: str,
    content: str,
    token_count: int | None = None,
) -> Message:
    """Persist a single message and its matching context-window entry.

    Atomically creates one ``Message`` row and one ``ContextItem`` row that
    points to it.  Both share the same ``ordinal`` so the context assembler
    can order context items without joining the messages table.

    The session is flushed (but not committed) so that the new rows are
    visible within the same transaction for any subsequent operations.

    Args:
        db: Async database session.
        conversation_id: UUID of the owning conversation.
        user_id: UUID of the user who authored the message, or ``None``
            for assistant / system messages.
        role: Message role — one of ``"user"``, ``"assistant"``,
            ``"thinking"``, ``"tool_use"``, or ``"tool_result"``.
        content: Raw text content of the message.
        token_count: Pre-computed token count, or ``None`` if unknown.

    Returns:
        The newly flushed ``Message`` ORM instance (ID is populated).
    """
    ordinal = await get_next_ordinal(db, conversation_id)

    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conversation_id,
        user_id=user_id,
        role=role,
        content=content,
        token_count=token_count,
        ordinal=ordinal,
        created_at=datetime.utcnow(),
    )
    db.add(msg)

    # Mirror every message with a ContextItem so the context assembler
    # only needs to walk context_items — it never reads messages directly.
    ctx = ContextItem(
        id=uuid.uuid4(),
        conversation_id=conversation_id,
        item_type="message",  # distinguishes from "summary" entries
        item_id=msg.id,
        ordinal=ordinal,
        token_count=token_count,
    )
    db.add(ctx)

    # Flush to materialise IDs without ending the transaction; the caller
    # commits after any remaining side-effects (e.g. updating updated_at).
    await db.flush()
    return msg


async def get_messages(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    *,
    limit: int | None = None,
) -> list[Message]:
    """Return all messages for a conversation, sorted by ordinal.

    Used by the context assembler (Phase 2) to reconstruct conversation
    history before writing the JSONL file for the Claude Agent SDK.

    Args:
        db: Async database session (read-only — no flush or commit).
        conversation_id: UUID of the conversation to fetch.
        limit: If provided, return only the most-recent ``limit`` messages
            (the query orders ascending so the caller receives the tail).
            Pass ``None`` to fetch the full history.

    Returns:
        A list of ``Message`` instances ordered by ``ordinal`` ascending.
        Returns an empty list when the conversation has no messages.
    """
    q = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.ordinal)  # ascending — oldest first
    )
    if limit is not None:
        q = q.limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())
