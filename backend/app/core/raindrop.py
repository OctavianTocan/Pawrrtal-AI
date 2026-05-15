"""Raindrop AI analytics integration.

Instruments every AI turn with structured ``track_ai()`` events when
``RAINDROP_API_KEY`` is configured.  Completely no-op otherwise — no
imports, no threads, no overhead for dev environments that haven't
opted in.

Two integration paths are active when enabled:

1. **Analytics events** (this module) — ``track_ai()`` fires once at the
   end of every chat turn, capturing model, input/output, conversation
   context, and tool calls.  Events are buffered in memory and drained
   every second on a background thread.

2. **OTLP trace mirror** (``telemetry.py``) — when ``RAINDROP_WORKSHOP_URL``
   is set, the existing OTel provider adds a secondary ``BatchSpanProcessor``
   that mirrors *all* spans (FastAPI, SQLAlchemy, httpx) to the local
   Workshop debugger at ``<url>/v1/traces``.  No SDK needed for that path —
   it's pure OTel.

Why ``tracing_enabled=False``?
The raindrop-ai SDK delegates tracing to ``traceloop-sdk``, which calls
``opentelemetry.trace.set_tracer_provider()`` on init.  Our ``setup_tracing()``
already installs a custom provider and must run last so its Workshop exporter
is live.  Disabling the SDK's OTel layer lets us keep full control over the
provider while still using raindrop's non-OTel event buffering path for
analytics.
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# Module-level idempotency guard — mirrors the pattern in telemetry.py.
_initialised = False


# ---------------------------------------------------------------------------
# Feature flag
# ---------------------------------------------------------------------------


def raindrop_analytics_enabled() -> bool:
    """Return True when a Raindrop API key is present in the environment."""
    return bool(os.environ.get("RAINDROP_API_KEY"))


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


def setup_raindrop() -> None:
    """Initialize the raindrop-ai SDK when ``RAINDROP_API_KEY`` is set.

    Idempotent — safe to call multiple times.  ``tracing_enabled=False``
    keeps the SDK out of our OTel TracerProvider so ``setup_tracing()`` in
    ``telemetry.py`` remains in full control of span routing.
    """
    global _initialised  # noqa: PLW0603 — idempotency singleton

    if _initialised:
        return

    if not raindrop_analytics_enabled():
        logger.info("RAINDROP_DISABLED reason=no_api_key")
        _initialised = True
        return

    try:
        import raindrop.analytics as rd  # noqa: PLC0415 — deferred: SDK may not be installed

        rd.init(
            api_key=os.environ["RAINDROP_API_KEY"],
            # Keep raindrop out of our OTel provider — Workshop OTLP mirror
            # is wired directly in telemetry.py so both paths work together.
            tracing_enabled=False,
            app_name="pawrrtal-backend",
        )
        _initialised = True
        logger.info("RAINDROP_ENABLED")
    except ImportError:
        logger.warning(
            "RAINDROP_INSTALL_MISSING — RAINDROP_API_KEY is set but "
            "raindrop-ai is not installed.  Run: uv add raindrop-ai",
        )
        _initialised = True  # Don't retry on every call


def shutdown_raindrop() -> None:
    """Flush buffered events and shut down the raindrop SDK gracefully.

    No-op when the SDK was never initialised.
    """
    global _initialised  # noqa: PLW0603 — idempotency singleton

    if not _initialised or not raindrop_analytics_enabled():
        return

    try:
        import raindrop.analytics as rd  # noqa: PLC0415 — deferred: SDK may not be installed

        rd.flush()
        rd.shutdown()
    except Exception:
        logger.warning("RAINDROP_SHUTDOWN_FAILED", exc_info=True)
    finally:
        _initialised = False


# ---------------------------------------------------------------------------
# Per-turn event tracking
# ---------------------------------------------------------------------------


def track_ai_turn(
    *,
    model_id: str,
    question: str,
    response: str,
    conversation_id: str,
    user_id: str,
    tool_calls: list[dict[str, Any]] | None = None,
    duration_ms: float | None = None,
) -> None:
    """Emit a structured analytics event for one completed AI turn.

    Called from ``turn_runner._finalize_turn`` after the assistant message
    is persisted.  Failures are swallowed — analytics must never break the
    chat path.

    Args:
        model_id: Canonical model identifier, e.g. ``"claude-sonnet-4-6"``.
        question: The user's message (input to the model).
        response: The aggregated assistant text response.
        conversation_id: App-level UUID string for the conversation.
        user_id: App-level UUID string for the requesting user.
        tool_calls: Optional list of tool-call dicts from the aggregator.
        duration_ms: Optional wall-clock duration of the turn in ms.
    """
    if not _initialised or not raindrop_analytics_enabled():
        return

    try:
        import raindrop.analytics as rd  # noqa: PLC0415 — deferred: SDK may not be installed

        properties: dict[str, Any] = {
            "tool_call_count": len(tool_calls or []),
        }
        if duration_ms is not None:
            properties["duration_ms"] = round(duration_ms)
        if tool_calls:
            properties["tool_names"] = [tc.get("name") for tc in tool_calls if tc.get("name")]

        rd.track_ai(
            user_id=user_id,
            event_type="chat_turn",
            model=model_id,
            input=question,
            output=response,
            conversation_id=conversation_id,
            properties=properties,
        )
    except Exception:
        logger.debug("RAINDROP_TRACK_AI_FAILED", exc_info=True)
