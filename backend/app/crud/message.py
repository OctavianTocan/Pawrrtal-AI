"""
CRUD helpers for Message, ContextItem, and Summary models.

Callers pass an open ``AsyncSession``.  Functions call ``flush()`` but
never ``commit()``; the caller commits after any remaining work.
``user_id`` should be ``None`` for assistant or system messages.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ContextItem, Message, Summary


async def get_next_ordinal(db: AsyncSession, conversation_id: uuid.UUID) -> int:
    """Return the next ordinal for a new message in this conversation.

    The first message gets ordinal 0.  Each subsequent message gets
    one higher than the current maximum.

    Args:
        db: Async database session.
        conversation_id: UUID of the conversation to query.

    Returns:
        The next available ordinal (0 when the conversation is empty).
    """
    result = await db.execute(
        select(func.coalesce(func.max(Message.ordinal), -1)).where(
            Message.conversation_id == conversation_id
        )
    )
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
    """Save a message and a matching position entry to the database.

    Creates a ``Message`` row and a ``ContextItem`` row pointing to it
    in the same flush, so the two are always in sync.

    Args:
        db: Async database session.
        conversation_id: UUID of the owning conversation.
        user_id: UUID of the user who sent the message, or ``None``
            for assistant messages.
        role: One of ``"user"``, ``"assistant"``, ``"thinking"``,
            ``"tool_use"``, or ``"tool_result"``.
        content: Text content of the message.
        token_count: Token count if already known, otherwise ``None``.

    Returns:
        The saved ``Message`` instance.
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

    # Each message gets a matching ContextItem that records its position.
    # This makes it easy to fetch the ordered history without extra joins.
    ctx = ContextItem(
        id=uuid.uuid4(),
        conversation_id=conversation_id,
        item_type="message",  # distinguishes from "summary" entries
        item_id=msg.id,
        ordinal=ordinal,
        token_count=token_count,
    )
    db.add(ctx)

    # Flush so the IDs are available within the transaction; the caller commits.
    await db.flush()
    return msg


async def get_messages(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    *,
    limit: int | None = None,
) -> list[Message]:
    """Return messages for a conversation in order, oldest first.

    Args:
        db: Async database session.
        conversation_id: UUID of the conversation to fetch.
        limit: Return at most this many messages. ``None`` fetches all.

    Returns:
        Messages ordered by ``ordinal`` ascending. Empty list if none.
    """
    q = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.ordinal)
    )
    if limit is not None:
        q = q.limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())
