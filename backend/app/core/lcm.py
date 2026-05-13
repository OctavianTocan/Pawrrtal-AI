"""Lossless Context Management — ingest, assembly, and leaf compaction.

PR history
----------
PR #1 — schema + models          (``app/models.py``, migration 012)
PR #2 — ingest + assembly        (this module first landed)
PR #3 — leaf compaction          (``compact_leaf_if_needed`` + updated assembly)

Public API
----------
``ingest_message``           — record a new ChatMessage in lcm_context_items
``assemble_context``         — build the [{role, content}] context list for a turn
``compact_leaf_if_needed``   — summarise the oldest non-fresh items into a leaf
                               LCMSummary and rewrite lcm_context_items in place

All functions are always importable; callers gate on ``is_enabled()``
(default ``False``) before invoking them.

Configuration helpers
---------------------
``is_enabled``           — return ``settings.lcm_enabled``
``fresh_tail_count``     — return ``settings.lcm_fresh_tail_count``
``leaf_chunk_tokens``    — return ``settings.lcm_leaf_chunk_tokens``

These thin wrappers allow callers such as ``app.api.chat`` to access
LCM-specific configuration through this module alone, without a direct
``app.core.config`` import that would bloat their fan-out.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings as _settings
from app.core.providers import resolve_llm
from app.models import ChatMessage, LCMContextItem, LCMSummary, LCMSummarySource

_log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration accessors
# Thin wrappers so callers don't need a direct `app.core.config` import.
# ---------------------------------------------------------------------------


def is_enabled() -> bool:
    """Return whether the LCM system is enabled."""
    return _settings.lcm_enabled


def fresh_tail_count() -> int:
    """Return the number of context items kept verbatim (the fresh tail)."""
    return _settings.lcm_fresh_tail_count


def leaf_chunk_tokens() -> int:
    """Return the maximum token budget for a single leaf compaction chunk."""
    return _settings.lcm_leaf_chunk_tokens

# ---------------------------------------------------------------------------
# Summarisation prompts — three-level escalation mirrors the upstream plugin.
# ---------------------------------------------------------------------------

_PROMPT_NORMAL = """\
You are a memory compressor for an AI assistant.  Summarise the following
conversation extract into a compact but lossless paragraph.  Preserve every
decision, fact, file name, error message, and instruction so the assistant can
reconstruct the full context from your summary alone.  Output the summary only
— no preamble, no commentary.

{turns}"""

_PROMPT_AGGRESSIVE = """\
Summarise the following conversation in one tight paragraph.  Keep only the
most important decisions, facts, and instructions.  Output the summary only.

{turns}"""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _approx_tokens(text: str) -> int:
    """Rough token count: 4 characters ≈ 1 token (good enough for budgeting)."""
    return max(1, len(text) // 4)


def _format_turns(messages: list[dict[str, str]]) -> str:
    """Format [{role, content}] as a plain-text transcript for the summary prompt."""
    parts: list[str] = []
    for m in messages:
        role = m.get("role", "").upper()
        content = m.get("content", "")
        if content:
            parts.append(f"{role}: {content}")
    return "\n\n".join(parts)


async def _collect_stream(stream: AsyncIterator[Any]) -> str:
    """Consume a provider stream and return all concatenated delta text."""
    parts: list[str] = []
    async for event in stream:
        if event.get("type") == "delta":
            chunk = event.get("content") or ""
            if chunk:
                parts.append(chunk)
    return "".join(parts).strip()


async def _summarize(
    provider: Any,
    turns_text: str,
    user_id: uuid.UUID,
) -> tuple[str, str]:
    """Call the provider to summarise a turn block.

    Three-level escalation:
    1. Normal prompt — full fidelity.
    2. Aggressive prompt — shorter, if normal fails or returns empty.
    3. Deterministic fallback — first 1 500 chars of the raw transcript.

    Returns:
        ``(summary_text, summary_kind)`` where ``summary_kind`` is one of
        ``"normal"``, ``"aggressive"``, or ``"fallback"``.
    """
    for prompt_template, kind in (
        (_PROMPT_NORMAL, "normal"),
        (_PROMPT_AGGRESSIVE, "aggressive"),
    ):
        try:
            stream = provider.stream(
                question=prompt_template.format(turns=turns_text),
                # Isolated fake conversation — not a real chat turn.
                conversation_id=uuid.uuid4(),
                user_id=user_id,
                history=None,
                tools=None,
                system_prompt=None,
            )
            text = await _collect_stream(stream)
            if text:
                return text, kind
        except Exception:
            _log.warning("LCM_SUMMARIZE_%s_FAILED", kind.upper(), exc_info=True)

    # Deterministic truncation — always produces output.
    return turns_text[:1500], "fallback"


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
        entry = _resolve_context_item(item, messages_by_id, summaries_by_id)
        if entry is not None:
            context.append(entry)
    return context


def _resolve_context_item(
    item: LCMContextItem,
    messages_by_id: dict[uuid.UUID, ChatMessage],
    summaries_by_id: dict[uuid.UUID, LCMSummary],
) -> dict[str, Any] | None:
    """Resolve one LCMContextItem to a ``{role, content}`` dict, or ``None``.

    Extracted to keep ``assemble_context``'s loop body within the nesting budget.
    """
    if item.item_kind == "message":
        msg = messages_by_id.get(item.item_id)
        if msg is not None and msg.role in {"user", "assistant"}:
            return {"role": msg.role, "content": msg.content or ""}
    elif item.item_kind == "summary":
        summary = summaries_by_id.get(item.item_id)
        if summary is not None:
            return {
                "role": "user",
                "content": f"[Summary of earlier conversation]\n{summary.content}",
            }
    return None


async def _condense_at_depth(
    session: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    model_id: str,
    depth: int,
    max_chunk_tokens: int,
) -> bool:
    """Run one condensation pass: merge depth-*d* summaries into a depth-*(d+1)* parent.

    Finds all ``LCMContextItem`` rows whose backing ``LCMSummary`` has the
    given *depth*.  If at least two such items exist, takes the oldest batch
    (up to *max_chunk_tokens* source tokens), calls the provider to produce a
    parent summary, writes ``LCMSummary`` (depth+1) + ``LCMSummarySource``
    edges, and replaces the compacted context items with a single
    ``item_kind="summary"`` row pointing at the new parent.

    Returns:
        ``True`` if a condensation pass ran, ``False`` if nothing to condense
        (fewer than 2 eligible items).
    """
    # Fetch all context items pointing at summaries.
    all_items_result = await session.execute(
        select(LCMContextItem)
        .where(LCMContextItem.conversation_id == conversation_id)
        .order_by(LCMContextItem.ordinal.asc())
    )
    all_items = list(all_items_result.scalars().all())

    summary_item_ids = [i.item_id for i in all_items if i.item_kind == "summary"]
    if len(summary_item_ids) < 2:
        return False

    # Fetch the summaries to filter by depth.
    s_result = await session.execute(
        select(LCMSummary).where(LCMSummary.id.in_(summary_item_ids))
    )
    summaries_by_id: dict[uuid.UUID, LCMSummary] = {
        s.id: s for s in s_result.scalars().all()
    }

    # Items eligible for condensation: context items pointing at depth-*d* summaries.
    eligible: list[tuple[LCMContextItem, LCMSummary]] = [
        (item, summaries_by_id[item.item_id])
        for item in all_items
        if item.item_kind == "summary"
        and item.item_id in summaries_by_id
        and summaries_by_id[item.item_id].depth == depth
    ]

    if len(eligible) < 2:
        return False

    # Build the batch (token-budget cap).
    selected_items: list[LCMContextItem] = []
    selected_messages: list[dict[str, str]] = []
    running_tokens = 0

    for item, summ in eligible:
        toks = _approx_tokens(summ.content)
        if running_tokens + toks > max_chunk_tokens and selected_items:
            break
        selected_items.append(item)
        selected_messages.append(
            {
                "role": "user",
                "content": f"[Summary depth={summ.depth}]\n{summ.content}",
            }
        )
        running_tokens += toks

    if len(selected_items) < 2:
        return False

    # Summarise the batch.
    turns_text = _format_turns(selected_messages)
    summary_text, summary_kind = await _summarize(
        resolve_llm(_settings.lcm_summary_model or model_id, user_id=user_id),
        turns_text,
        user_id,
    )

    _log.info(
        "LCM_CONDENSE depth=%d→%d conversation_id=%s sources=%d",
        depth,
        depth + 1,
        conversation_id,
        len(selected_items),
    )

    # Write parent LCMSummary.
    parent = LCMSummary(
        conversation_id=conversation_id,
        depth=depth + 1,
        content=summary_text,
        token_count=_approx_tokens(summary_text),
        model_id=_settings.lcm_summary_model or model_id,
        summary_kind=summary_kind,
    )
    session.add(parent)
    await session.flush()

    # Write source edges.
    for src_ordinal, item in enumerate(selected_items):
        session.add(
            LCMSummarySource(
                summary_id=parent.id,
                source_kind="summary",
                source_id=item.item_id,
                source_ordinal=src_ordinal,
            )
        )

    # Rewrite context items.
    slot_ordinal = selected_items[0].ordinal
    for item in selected_items:
        await session.delete(item)
    await session.flush()

    session.add(
        LCMContextItem(
            conversation_id=conversation_id,
            ordinal=slot_ordinal,
            item_kind="summary",
            item_id=parent.id,
        )
    )
    await session.flush()

    return True


async def compact_leaf_if_needed(
    session: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    model_id: str,
    fresh_tail_count: int,
    max_chunk_tokens: int,
) -> bool:
    """Run one leaf-compaction pass if items exist outside the fresh tail.

    Algorithm
    ---------
    1.  Fetch the full ``lcm_context_items`` list for the conversation.
    2.  If ``total_items <= fresh_tail_count`` there is nothing to compact.
    3.  The *eligible* items are the oldest ones that fall outside the fresh
        tail (``all_items[:total - fresh_tail_count]``).  Only
        ``item_kind="message"`` rows are compacted; existing summaries inside
        the eligible window are left in place (they are already compact).
    4.  Batch the oldest eligible messages up to ``max_chunk_tokens`` source
        tokens (approximate; 4 chars ≈ 1 token).
    5.  Call the provider (three-level escalation) to produce a summary.
    6.  Persist: :class:`~app.models.LCMSummary` + one
        :class:`~app.models.LCMSummarySource` per source message.
    7.  Rewrite ``lcm_context_items``: delete the compacted message rows,
        insert one ``item_kind="summary"`` row at the lowest freed ordinal
        slot.  No dense renumbering is needed — ``ingest_message`` uses
        ``max(ordinal) + 1`` so gaps are harmless.

    Returns:
        ``True`` if a compaction pass ran, ``False`` if there was nothing to
        compact or the eligible window contained no un-compacted messages.
    """
    # ------------------------------------------------------------------ 1+2
    all_items_result = await session.execute(
        select(LCMContextItem)
        .where(LCMContextItem.conversation_id == conversation_id)
        .order_by(LCMContextItem.ordinal.asc())
    )
    all_items = list(all_items_result.scalars().all())
    total = len(all_items)

    if total <= fresh_tail_count:
        return False

    # ------------------------------------------------------------------ 3
    # Eligible = items outside the fresh tail (oldest end).
    eligible = all_items[: total - fresh_tail_count]
    eligible_message_ids = [
        item.item_id for item in eligible if item.item_kind == "message"
    ]

    if not eligible_message_ids:
        return False  # Only summaries outside the fresh tail — nothing to do.

    # ------------------------------------------------------------------ 4
    msg_result = await session.execute(
        select(ChatMessage).where(ChatMessage.id.in_(eligible_message_ids))
    )
    messages_by_id: dict[uuid.UUID, ChatMessage] = {
        m.id: m for m in msg_result.scalars().all()
    }

    selected_items: list[LCMContextItem] = []
    selected_messages: list[dict[str, str]] = []
    running_tokens = 0

    for item in eligible:
        if item.item_kind != "message":
            continue
        msg = messages_by_id.get(item.item_id)
        if msg is None:
            continue
        msg_tokens = _approx_tokens(msg.content or "")
        # Stop if we've already selected at least one and adding this one
        # would exceed the chunk budget.
        if running_tokens + msg_tokens > max_chunk_tokens and selected_items:
            break
        selected_items.append(item)
        selected_messages.append({"role": msg.role, "content": msg.content or ""})
        running_tokens += msg_tokens

    if not selected_items:
        return False

    # ------------------------------------------------------------------ 5
    summary_model = _settings.lcm_summary_model or model_id
    provider = resolve_llm(summary_model, user_id=user_id)
    turns_text = _format_turns(selected_messages)
    summary_text, summary_kind = await _summarize(provider, turns_text, user_id)

    _log.info(
        "LCM_COMPACT conversation_id=%s kind=%s sources=%d tokens=%d→%d",
        conversation_id,
        summary_kind,
        len(selected_items),
        running_tokens,
        _approx_tokens(summary_text),
    )

    # ------------------------------------------------------------------ 6
    summary_row = LCMSummary(
        conversation_id=conversation_id,
        depth=0,
        content=summary_text,
        token_count=_approx_tokens(summary_text),
        model_id=summary_model,
        summary_kind=summary_kind,
    )
    session.add(summary_row)
    await session.flush()

    for src_ordinal, item in enumerate(selected_items):
        session.add(
            LCMSummarySource(
                summary_id=summary_row.id,
                source_kind="message",
                source_id=item.item_id,
                source_ordinal=src_ordinal,
            )
        )

    # ------------------------------------------------------------------ 7
    # Record the ordinal slot before deleting the items.
    slot_ordinal = selected_items[0].ordinal

    for item in selected_items:
        await session.delete(item)
    await session.flush()

    session.add(
        LCMContextItem(
            conversation_id=conversation_id,
            ordinal=slot_ordinal,
            item_kind="summary",
            item_id=summary_row.id,
        )
    )
    await session.flush()

    # ------------------------------------------------------------------ Condensation
    # After leaf compaction, run incremental condensation passes so accumulated
    # leaf summaries are folded into deeper parent nodes.
    # ``lcm_incremental_max_depth`` controls how many passes to attempt:
    #   0  = leaf-only (no condensation)
    #   1  = one pass (leaf → depth-1)  [default]
    #  -1  = unlimited cascade
    if _settings.lcm_incremental_max_depth != 0:
        passes = (
            _settings.lcm_incremental_max_depth
            if _settings.lcm_incremental_max_depth > 0
            else 999  # unlimited practical cap
        )
        for depth in range(passes):
            ran = await _condense_at_depth(
                session,
                conversation_id=conversation_id,
                user_id=user_id,
                model_id=model_id,
                depth=depth,
                max_chunk_tokens=max_chunk_tokens,
            )
            if not ran:
                break  # nothing more to condense at this depth or beyond

    return True
