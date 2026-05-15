"""CRUD over ``webhook_events`` — atomic dedupe + diagnostic listing."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WebhookEventRecord

DEFAULT_LIST_LIMIT = 100
MAX_LIST_LIMIT = 1000


async def insert_or_dedupe_webhook_event(
    *,
    session: AsyncSession,
    provider: str,
    event_type_name: str,
    delivery_id: str,
    payload: dict[str, Any],
    user_id: uuid.UUID | None = None,
) -> WebhookEventRecord | None:
    """Try to insert a new webhook delivery; return ``None`` on duplicate.

    Atomic: two concurrent receivers handling the same delivery_id
    will see exactly one win the insert; the other catches the
    `IntegrityError` and returns ``None``.  Using exception-based
    dedupe instead of ``ON CONFLICT DO NOTHING`` keeps the helper
    portable across SQLite (tests) and Postgres (prod).
    """
    row = WebhookEventRecord(
        id=uuid.uuid4(),
        user_id=user_id,
        provider=provider,
        event_type=event_type_name,
        delivery_id=delivery_id,
        payload=payload,
        created_at=datetime.now(UTC),
    )
    session.add(row)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        return None
    return row


async def mark_webhook_processed(
    *,
    session: AsyncSession,
    webhook_id: uuid.UUID,
) -> bool:
    """Set ``processed_at`` so the diagnostics view shows delivery status."""
    row = await session.get(WebhookEventRecord, webhook_id)
    if row is None:
        return False
    row.processed_at = datetime.now(UTC)
    await session.commit()
    return True


async def list_webhook_events(
    *,
    session: AsyncSession,
    provider: str | None = None,
    limit: int = DEFAULT_LIST_LIMIT,
    offset: int = 0,
) -> Sequence[WebhookEventRecord]:
    """Newest-first slice of webhook deliveries (admin / diagnostic use)."""
    capped_limit = min(max(1, limit), MAX_LIST_LIMIT)
    stmt = (
        select(WebhookEventRecord)
        .order_by(WebhookEventRecord.created_at.desc())
        .limit(capped_limit)
        .offset(max(0, offset))
    )
    if provider is not None:
        stmt = stmt.where(WebhookEventRecord.provider == provider)
    result = await session.execute(stmt)
    return list(result.scalars().all())
