"""Fire-and-forget LCM compaction trigger.

Splits the background-task plumbing out of
``app.channels.turn_runner`` to keep that module under the project's
500-line file budget while keeping the public surface tiny:
``schedule_lcm_compaction`` is the single seam ``_finalize_turn``
calls when ``settings.lcm_enabled`` is on.

All errors are swallowed inside the bg helper — a failed compaction
is invisible to the user; the full message history stays preserved
in ``chat_messages``.

Concurrency model
-----------------
Compactions for the same conversation are serialized through a
per-conversation :class:`asyncio.Lock`.  Two consecutive turns (web +
Telegram, or rapid back-to-back user turns) would otherwise race each
other on:

* The shared ``(conversation_id, ordinal)`` unique constraint in
  ``lcm_context_items`` — both runs select the same eligible rows
  and try to insert a summary at the same freed ordinal slot.
* The DB connection pool — without a lock every concurrent turn
  pins a connection across the full LLM round-trip.

Different conversations stay parallel; only same-conversation runs
queue.  When a lock has no waiters and is not held it is dropped
from the registry so the dict doesn't grow unbounded.
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

# Per-conversation lock registry — serializes compaction passes for the
# same conversation across concurrent turns.  See module docstring for
# the concurrency model.
_LCM_COMPACT_LOCKS: dict[uuid.UUID, asyncio.Lock] = {}


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
    lifecycle and acquires the per-conversation lock so concurrent
    runs queue instead of racing.  All exceptions are caught and
    logged.
    """
    lock = _LCM_COMPACT_LOCKS.setdefault(conversation_id, asyncio.Lock())
    try:
        async with lock, async_session_maker() as compact_session:
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
    finally:
        # Drop the lock entry when nothing else is waiting; this keeps
        # the registry from growing unbounded for one-shot conversations
        # while leaving busy conversations' locks pinned until their
        # queue drains.
        if not lock.locked() and conversation_id in _LCM_COMPACT_LOCKS:
            _LCM_COMPACT_LOCKS.pop(conversation_id, None)
