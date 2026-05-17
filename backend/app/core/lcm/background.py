"""Fire-and-forget LCM compaction trigger.

Splits the background-task plumbing out of
``app.channels.turn_runner`` to keep that module under the project's
500-line file budget while keeping the public surface tiny:
``schedule_lcm_compaction`` is the single seam ``_finalize_turn``
calls when ``settings.lcm_enabled`` is on.

All errors are swallowed inside the bg helper — a failed compaction
is invisible to the user; the full message history stays preserved
in ``chat_messages``.
"""

from __future__ import annotations

import asyncio
import logging
import uuid

from app.core.config import settings
from app.core.lcm import compact_leaf_if_needed
from app.db import async_session_maker

logger = logging.getLogger(__name__)

# Holds strong refs to fire-and-forget background tasks (LCM compaction).
# Without this set, the GC can collect the task mid-flight because
# ``asyncio.create_task`` only stores a weak reference to its return
# value; the task drops itself from this set on completion so the set
# doesn't grow unbounded.
_LCM_COMPACT_TASKS: set[asyncio.Task[None]] = set()


def schedule_lcm_compaction(
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    model_id: str,
) -> None:
    """Fire one LCM leaf-compaction pass for ``conversation_id`` in the background.

    No-op when ``settings.lcm_enabled`` is ``False`` so callers can drop
    the gate.  The task keeps a strong reference in
    :data:`_LCM_COMPACT_TASKS` to survive GC and self-cleans on
    completion.
    """
    if not settings.lcm_enabled:
        return
    task = asyncio.create_task(
        _lcm_compact_bg(
            conversation_id=conversation_id,
            user_id=user_id,
            model_id=model_id,
        )
    )
    _LCM_COMPACT_TASKS.add(task)
    task.add_done_callback(_LCM_COMPACT_TASKS.discard)


async def _lcm_compact_bg(
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    model_id: str,
) -> None:
    """Run one LCM leaf-compaction pass for ``conversation_id``.

    Opens its own session so it runs independently of the request
    lifecycle.  All exceptions are caught and logged.
    """
    try:
        async with async_session_maker() as compact_session:
            await compact_leaf_if_needed(
                compact_session,
                conversation_id=conversation_id,
                user_id=user_id,
                model_id=model_id,
                fresh_tail_count=settings.lcm_fresh_tail_count,
                max_chunk_tokens=settings.lcm_leaf_chunk_tokens,
            )
            await compact_session.commit()
    except Exception:
        logger.exception(
            "LCM_COMPACT_BG_ERR conversation_id=%s",
            conversation_id,
        )
