"""CRUD helpers for Message, ContextItem, and Summary models."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ContextItem, Message, Summary


async def get_next_ordinal(db: AsyncSession, conversation_id: uuid.UUID) -> int:
    """Return the next ordinal value for a new message in a conversation."""
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
    """Persist a single message and add a matching ContextItem."""
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

    ctx = ContextItem(
        id=uuid.uuid4(),
        conversation_id=conversation_id,
        item_type="message",
        item_id=msg.id,
        ordinal=ordinal,
        token_count=token_count,
    )
    db.add(ctx)

    await db.flush()  # get IDs without committing
    return msg


async def get_messages(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    *,
    limit: int | None = None,
) -> list[Message]:
    """Return messages for a conversation in ordinal order."""
    q = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.ordinal)
    )
    if limit is not None:
        q = q.limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())
