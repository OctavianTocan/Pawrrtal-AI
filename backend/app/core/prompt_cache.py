"""Prompt-cache observability helpers.

The Claude Agent SDK applies Anthropic prompt caching automatically when
the system prompt string is byte-stable across turns: the CLI tags the
last system block with ``cache_control: {type: "ephemeral"}`` and the
Anthropic API replays the cached prefix on subsequent calls.  Caching
the system+tools prefix yields ~90% input-cost reductions on stable
workloads — but only if the prefix really is stable, which is easy to
break inadvertently (a per-turn timestamp, a non-deterministic file
walk, a stray ``f"...{datetime.utcnow()}..."`` in an injected helper).

This module exists so we can *observe* whether the prefix is stable.
:func:`compute_prompt_cache_key` returns a deterministic short hash of
the inputs that influence cache eligibility; the chat router logs the
key per turn so a cache-busting regression shows up as a constantly
changing key in the structured logs.

When we eventually add a raw Anthropic API client (no SDK), this is
the natural home for the explicit ``cache_control`` block-attachment
helpers too — keeping the cache strategy in one module rather than
sprinkled across the providers.
"""

from __future__ import annotations

import hashlib
import logging
import uuid

# Truncated to 12 hex chars — long enough to make collisions
# astronomically unlikely for a single user's session, short enough to
# read at a glance in the logs.
_KEY_HEX_LENGTH = 12


def compute_prompt_cache_key(*, system_prompt: str | None, model_id: str) -> str:
    """Return a short, deterministic key over the cache-influencing inputs.

    The key is a SHA-256 prefix of ``(model_id, system_prompt)``.
    Identical inputs produce identical keys across runs, which is what
    makes it useful as a cache-stability probe in the structured logs:
    a key that flips between two values turn-to-turn is the signature
    of a non-deterministic prompt assembler.

    Args:
        system_prompt: The fully-assembled system prompt the provider
            will send.  ``None`` is treated as the empty string so
            "no prompt" and "empty prompt" share a key.
        model_id: Canonical model id the request is bound for.
            Included because each model has its own cache namespace
            on the Anthropic side; a stable system prompt against
            two different models produces two distinct cache entries.

    Returns:
        A 12-character lowercase hex string suitable for structured
        log fields.  Not cryptographically meaningful — do not rely on
        it for security.
    """
    payload = b"\x00".join(
        [
            model_id.encode("utf-8"),
            (system_prompt or "").encode("utf-8"),
        ]
    )
    digest = hashlib.sha256(payload).hexdigest()
    return digest[:_KEY_HEX_LENGTH]


def log_prompt_cache_key(
    logger: logging.Logger,
    *,
    rid: str | None,
    conversation_id: uuid.UUID,
    cache_key: str,
    system_prompt_chars: int,
) -> None:
    """Emit a single structured log line tagging this turn's cache key.

    Kept as a separate helper (rather than inlined in the chat router)
    so the field set stays uniform across surfaces that adopt caching
    later (Telegram channel, CLI commit agent, future raw-API path).

    Args:
        logger: Caller's module logger.
        rid: Request id from :mod:`app.core.request_logging`, if
            available.  Optional so non-HTTP entry points (CLI tools,
            background jobs) can log without inventing a fake rid.
        conversation_id: Conversation the turn belongs to.  Included
            so a log scan can confirm cache keys are stable *within a
            conversation* but expected to differ across conversations.
        cache_key: The value returned by :func:`compute_prompt_cache_key`.
        system_prompt_chars: Length of the system prompt sent on this
            turn.  Logged alongside the key so a sudden length change
            (e.g. an injected per-turn section) is greppable.
    """
    logger.info(
        "PROMPT_CACHE rid=%s conversation_id=%s cache_key=%s system_prompt_chars=%d",
        rid or "<none>",
        conversation_id,
        cache_key,
        system_prompt_chars,
    )
