"""Chat API — channel-routed, provider-agnostic streaming endpoint."""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

import anyio
from fastapi import Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from opentelemetry import trace as _otel_trace
from sqlalchemy.ext.asyncio import AsyncSession

from app.channels import resolve_channel, surface_from_header
from app.channels.base import ChannelMessage
from app.core.agent_loop.types import PermissionCheckResult
from app.core.agent_tools import build_agent_tools
from app.core.chat_aggregator import ChatTurnAggregator
from app.core.config import settings
from app.core.event_bus import TurnCompletedEvent, TurnStartedEvent
from app.core.event_bus.global_bus import publish_if_available
from app.core.governance.cost_tracker import (
    CostBudget,
    PostgresCostLedger,
    per_request_reservation_usd,
    record_turn_cost,
)
from app.core.governance.permissions import (
    PermissionContext,
    build_default_permission_check,
)
from app.core.governance.workspace_context import (
    WorkspaceContext,
    load_workspace_context,
)
from app.core.providers import StreamEvent, default_model, resolve_llm
from app.core.providers.catalog import find as find_catalog_entry
from app.core.providers.model_id import parse_model_id
from app.core.request_logging import get_request_id
from app.core.tools.agents_md import assemble_workspace_prompt
from app.core.tools.artifact_agent import (
    ARTIFACT_TOOL_NAME,
    ArtifactValidationError,
    build_artifact,
)
from app.crud.chat_message import (
    append_assistant_placeholder,
    append_user_message,
    finalize_assistant_message,
    get_messages_for_conversation,
)
from app.crud.conversation import (
    get_conversation_service,
    update_conversation_model_service,
)
from app.crud.workspace import get_default_workspace
from app.db import User, async_session_maker, get_async_session
from app.schemas import ChatRequest
from app.users import get_allowed_user

logger = logging.getLogger(__name__)

# How many recent messages to send as context to the provider.
# Keeps token usage predictable while preserving recent turns.
_HISTORY_WINDOW = 20


def _annotate_chat_span(
    *,
    user_id: object,
    conversation_id: object,
    model_id: str | None,
    surface: str,
    question_len: int,
    request_id: str,
) -> None:
    """Attach pawrrtal-namespaced attributes to the active OTel span.

    Pure observability — a failure here must never break the chat
    path, so the whole body is wrapped in a broad ``try / except``.
    ``get_current_span()`` returns a no-op when telemetry is disabled.
    """
    try:
        span = _otel_trace.get_current_span()
        span.set_attribute("pawrrtal.user_id", str(user_id))
        span.set_attribute("pawrrtal.conversation_id", str(conversation_id))
        span.set_attribute("pawrrtal.model_id", model_id or "<default>")
        span.set_attribute("pawrrtal.surface", surface)
        span.set_attribute("pawrrtal.question_len", question_len)
        span.set_attribute("pawrrtal.request_id", request_id)
    except Exception:
        logger.debug("OTEL_SPAN_ANNOTATE_FAILED", exc_info=True)


def _maybe_artifact_event(event: StreamEvent) -> StreamEvent | None:
    """Build an ``artifact`` SSE event from a ``render_artifact`` tool_use.

    Returns ``None`` for any other event so the caller can no-op cheaply.
    Validation errors are swallowed silently here — the tool's own
    ``execute`` callback will return a corrective error string to the LLM
    so the agent can self-correct on the next turn, and emitting a half-
    formed artifact event would leave the frontend rendering nothing.
    """
    if event.get("type") != "tool_use" or event.get("name") != ARTIFACT_TOOL_NAME:
        return None
    tool_input = event.get("input") or {}
    title = tool_input.get("title")
    spec = tool_input.get("spec")
    if not isinstance(title, str) or not isinstance(spec, dict):
        return None
    try:
        payload = build_artifact(title=title, spec=spec)
    except ArtifactValidationError:
        return None
    return StreamEvent(
        type="artifact",
        artifact={
            "id": payload["id"],
            "title": payload["title"],
            "spec": payload["spec"],
            # Echo the originating tool_use_id so the frontend can attach
            # this artifact to the matching tool-call slot if it wants to.
            "tool_use_id": event.get("tool_use_id", ""),
        },
    )


async def _enforce_cost_budget(
    *,
    user_id: object,
    session: AsyncSession,
    rid: str,
) -> None:
    """Pre-flight per-user cost cap.

    Called at the top of the chat handler so a denied request never
    pays for tool composition or provider resolution.  Fails OPEN on
    DB errors — the gate is a soft control and the Claude SDK's
    per-request ``max_budget_usd`` still bounds the worst case.
    """
    if not settings.cost_tracker_enabled:
        return
    if settings.cost_max_per_user_daily_usd <= 0:
        return

    budget = CostBudget(
        max_per_request_usd=float(settings.cost_max_per_request_usd),
        max_per_user_window_usd=float(settings.cost_max_per_user_daily_usd),
        window_hours=int(settings.cost_reset_window_hours),
    )
    ledger = PostgresCostLedger(session=session)
    try:
        cumulative = await ledger.cumulative_window_usd(
            user_id=user_id,  # type: ignore[arg-type]
            window_hours=budget.window_hours,
        )
    except Exception:
        logger.exception("CHAT_COST_LOOKUP_FAILED rid=%s user_id=%s", rid, user_id)
        return
    reservation = per_request_reservation_usd(budget)
    if cumulative + reservation <= budget.max_per_user_window_usd:
        return
    remaining = max(0.0, budget.max_per_user_window_usd - cumulative)
    logger.info(
        "CHAT_COST_DENIED rid=%s user_id=%s cumulative=%.4f limit=%.4f window_hours=%d",
        rid,
        user_id,
        cumulative,
        budget.max_per_user_window_usd,
        budget.window_hours,
    )
    raise HTTPException(
        status_code=402,
        detail={
            "message": (
                f"Cost budget exhausted: ${cumulative:.4f} of "
                f"${budget.max_per_user_window_usd:.2f} used in the last "
                f"{budget.window_hours} hours."
            ),
            "remaining_usd": round(remaining, 4),
            "current_usd": round(cumulative, 4),
            "limit_usd": budget.max_per_user_window_usd,
            "window_hours": budget.window_hours,
        },
    )


async def _record_chat_turn_cost(
    *,
    session: AsyncSession,
    user_id: object,
    conversation_id: object,
    model_id: str,
    surface: str,
    aggregator: ChatTurnAggregator,
) -> None:
    """Append the turn's spend to ``cost_ledger``.

    No-op when cost tracking is disabled or the aggregator saw zero
    usage events (early failures, errors before the terminal turn).
    Catches and logs DB errors so a ledger write failure never leaves
    the assistant row unpersisted — the message persist commits in
    the same transaction, and skipping the ledger insert is the
    lesser harm than orphaning the message.
    """
    if not settings.cost_tracker_enabled:
        return
    if (
        aggregator.total_input_tokens <= 0
        and aggregator.total_output_tokens <= 0
        and aggregator.total_cost_usd <= 0
    ):
        return
    try:
        parsed = parse_model_id(model_id)
    except Exception:
        provider_slug = "unknown"
    else:
        provider_slug = parsed.host.value
        # Catalog lookup is informational — used by reporting; not
        # required for ledger insertion.
        find_catalog_entry(parsed)

    ledger = PostgresCostLedger(session=session)
    await record_turn_cost(
        ledger,
        user_id=user_id,  # type: ignore[arg-type]
        conversation_id=conversation_id,  # type: ignore[arg-type]
        provider=provider_slug,
        model_id=model_id,
        input_tokens=aggregator.total_input_tokens,
        output_tokens=aggregator.total_output_tokens,
        cost_usd=aggregator.total_cost_usd,
        surface=surface,
    )


def get_chat_router() -> APIRouter:  # noqa: C901, PLR0915
    """Build the chat ``APIRouter`` mounted at ``/api/v1/chat``.

    The complexity warnings are suppressed: this is a closure-based
    router builder whose body is intentionally a single streaming
    endpoint owning setup, persistence, the streamed body, and
    finalization in one async generator. Splitting it across helpers
    breaks the natural read order of the request lifecycle without
    actually reducing the shared state surface, so it stays inline.

    Returns:
        An ``APIRouter`` exposing a single streaming ``POST /`` endpoint
        that emits Server-Sent Events from the resolved AI provider.
    """
    router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

    @router.post("/")
    async def chat(  # noqa: C901, PLR0915 — single-endpoint stream lifecycle, see builder docstring
        request: ChatRequest,
        user: User = Depends(get_allowed_user),
        session: AsyncSession = Depends(get_async_session),
        x_nexus_surface: str | None = Header(default=None),
    ) -> StreamingResponse:
        """Stream an AI response as Server-Sent Events.

        SSE event shapes:
          {"type": "delta", "content": "..."}      — text chunk
          {"type": "thinking", "content": "..."}   — reasoning (when available)
          {"type": "tool_use", "name": "...", "input": {...}}
          {"type": "tool_result", "content": "..."}
          {"type": "error", "content": "..."}      — stream-level error
          [DONE]

        While streaming, the endpoint also persists the turn to the
        ``chat_messages`` table — the user prompt as a row, the assistant
        reply as a placeholder that is patched on stream end with the full
        chain-of-thought state. This is what powers ``GET /conversations/:id/messages``
        rehydration: the chat UI reads from ``chat_messages``, not from
        Agno's internal log.

        The provider is resolved from model_id — the endpoint is fully
        provider-agnostic. Changing model_id changes the provider; the
        stream format never changes.
        """
        # Entry log — pairs with REQ_IN/REQ_OUT from the request middleware via rid.
        # Question length, not contents, to avoid leaking PII into the log file.
        surface = surface_from_header(x_nexus_surface)
        channel = resolve_channel(surface)

        rid = get_request_id()

        # Annotate the FastAPI-instrumentor span with semantic attributes
        # so a trace search by user / conversation / model / surface lands
        # the right request immediately.
        _annotate_chat_span(
            user_id=user.id,
            conversation_id=request.conversation_id,
            model_id=request.model_id,
            surface=surface,
            question_len=len(request.question),
            request_id=rid,
        )
        logger.info(
            "CHAT_IN  rid=%s user_id=%s conversation_id=%s model_id=%s surface=%s question_len=%d",
            rid,
            user.id,
            request.conversation_id,
            request.model_id or "<default>",
            surface,
            len(request.question),
        )

        conversation = await get_conversation_service(user.id, session, request.conversation_id)
        if conversation is None:
            logger.warning(
                "CHAT_404 rid=%s user_id=%s conversation_id=%s",
                rid,
                user.id,
                request.conversation_id,
            )
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Resolve model: request overrides stored model, stored model overrides
        # catalog default.  Request and stored values are already canonical
        # (validated by Pydantic at the API boundary); ``default_model().id``
        # is the canonical wire form of the catalog default.
        model_id = request.model_id or conversation.model_id or default_model().id

        # Persist model change if it differs from what is stored
        if model_id != conversation.model_id:
            await update_conversation_model_service(
                model_id=model_id,
                user_id=user.id,
                conversation_id=request.conversation_id,
                session=session,
            )

        # Read recent history *before* persisting the current message so the
        # current question is not included in the history slice passed to the
        # provider (the provider receives it separately as ``question``).
        recent_rows = await get_messages_for_conversation(
            session, request.conversation_id, limit=_HISTORY_WINDOW
        )
        history = [
            {"role": row.role, "content": row.content or ""}
            for row in recent_rows
            if row.role in {"user", "assistant"}
        ]

        # Persist the user prompt + assistant placeholder rows up front so a
        # client that disconnects mid-stream still has a partial record.
        await append_user_message(
            session,
            conversation_id=request.conversation_id,
            user_id=user.id,
            content=request.question,
        )
        assistant_row = await append_assistant_placeholder(
            session,
            conversation_id=request.conversation_id,
            user_id=user.id,
        )
        assistant_message_id = assistant_row.id
        # Commit before streaming starts — the request session is closed when
        # the StreamingResponse generator runs in a fresh task, so we open a
        # short-lived session inside the generator for the final UPDATE.
        await session.commit()

        provider = resolve_llm(model_id, user_id=user.id)

        # Resolve the user's default workspace.  A workspace is created as
        # part of onboarding, so its absence means the user hasn't finished
        # that flow yet — the agent should not run at all in that state.
        # Refuse with 412 (Precondition Failed) so the frontend can route to
        # onboarding instead of pretending we shipped a degraded reply.
        workspace = await get_default_workspace(user.id, session)
        if workspace is None:
            raise HTTPException(
                status_code=412,
                detail="Onboarding not completed: no default workspace exists for this user.",
            )
        root = Path(workspace.path)
        # Blocking ``Path.exists()`` would stall the event loop on slow
        # FS / network mounts — route through ``anyio.Path`` so the stat
        # runs in a worker thread.
        if not await anyio.Path(root).exists():
            # Workspace row exists but the directory is gone (manually
            # deleted, volume wipe, etc.).  Same outcome — do not run.
            logger.error("CHAT_WORKSPACE_MISSING rid=%s user_id=%s path=%s", rid, user.id, root)
            raise HTTPException(
                status_code=412,
                detail="Workspace directory is missing on disk.  Re-run onboarding.",
            )
        # Pre-flight per-user cost gate (PR 04).  Refuses with HTTP
        # 402 when the user's rolling-window spend + a small reservation
        # would exceed ``cost_max_per_user_daily_usd``.  This sits
        # *after* the workspace gate (so an onboarding-incomplete user
        # never sees a confusing 402) and *before* tool composition /
        # provider resolution (so a denied request is cheap).  The
        # Claude SDK enforces the per-request cap natively via
        # ``max_budget_usd``; this gate enforces the per-user cap.
        await _enforce_cost_budget(
            user_id=user.id,
            session=session,
            rid=rid,
        )

        # Per-turn tool composition lives in `app.core.agent_tools` —
        # the chat router only decides *that* the agent gets tools,
        # not *which* (that's the builder's job, and where future
        # per-agent / per-user permission gating will land).  Provider
        # files stay tool-agnostic; see
        # `.claude/rules/architecture/no-tools-in-providers.md`.
        # Web send_fn — lets the agent call send_message() to push text or
        # files back to the user mid-turn.  Events are placed on a per-request
        # queue and drained into the SSE stream after each provider event,
        # keeping chat.py free of any tool-name coupling.
        _web_send_queue: asyncio.Queue[StreamEvent] = asyncio.Queue()

        async def _web_send_fn(
            text: str | None,
            file_path: Path | None,
            mime: str | None,
        ) -> None:
            event: StreamEvent = {"type": "message", "content": text or ""}
            if file_path is not None:
                event["attachment"] = str(file_path.relative_to(root))
                event["mime"] = mime
            await _web_send_queue.put(event)

        agent_tools = build_agent_tools(
            workspace_root=root,
            user_id=user.id,
            send_fn=_web_send_fn,
            surface=surface,
        )

        # PR 06: cross-provider WorkspaceContext.  Reads SOUL.md +
        # AGENTS.md + CLAUDE.md + ``.claude/skills/`` + ``.claude/settings.json``
        # in one pass and produces a single struct every provider +
        # the permission gate consume.  Falls back to the prior
        # ``assemble_workspace_prompt`` behaviour when context is
        # disabled (empty struct → caller sees ``None`` system prompt
        # and ``None`` allowlist, same as before).
        workspace_ctx: WorkspaceContext = load_workspace_context(root)
        workspace_system_prompt = workspace_ctx.system_prompt
        if workspace_system_prompt is None:
            # When the new loader is disabled and no workspace-context
            # files were found, fall back to the legacy prompt builder
            # so existing deployments don't lose their AGENTS.md.
            workspace_system_prompt = assemble_workspace_prompt(root)
        if workspace_system_prompt is not None:
            logger.debug(
                "CHAT_WORKSPACE_PROMPT rid=%s user_id=%s chars=%d skills=%d",
                rid,
                user.id,
                len(workspace_system_prompt),
                len(workspace_ctx.skills),
            )

        # Build the per-request permission gate (PR 03b).  ``PermissionContext``
        # captures workspace + user + surface so the gate's individual checks
        # (file-path boundary, bash boundary, workspace allowlist) have the
        # state they need; the closure below adapts the cross-provider
        # ``PermissionCheckFn`` signature ``(tool_name, arguments)`` so the
        # context never leaks into the agent loop.  Both providers consume
        # the same closure — Claude via the SDK's ``can_use_tool`` hook,
        # Gemini via ``AgentLoopConfig.permission_check``.
        permission_context = PermissionContext(
            user_id=str(user.id),
            workspace_root=root,
            conversation_id=str(request.conversation_id),
            surface=surface,
            enabled_tools=workspace_ctx.enabled_tools,
        )
        _gate = build_default_permission_check()

        async def permission_check_for_request(
            tool_name: str, arguments: dict[str, Any]
        ) -> PermissionCheckResult:
            decision = await _gate(tool_name, arguments, permission_context)
            return PermissionCheckResult(
                allow=decision.allow,
                reason=decision.reason,
                violation_type=decision.violation_type,
            )

        async def event_stream() -> AsyncGenerator[bytes]:
            """Yield channel-encoded bytes for each LLM event, then done.

            Builds a raw provider stream, wraps it with error handling and
            aggregation, then hands it to ``channel.deliver()`` which
            encodes each event for the surface (SSE frames for web/Electron,
            message edits for Telegram, etc.).
            """
            stream_start = time.perf_counter()
            event_count = 0
            aggregator = ChatTurnAggregator()
            # PR 10: announce the turn so subscribers (audit, metrics,
            # future webhook delivery) can react.  Fire-and-forget
            # via the global bus accessor; no-op when the bus is unset.
            await publish_if_available(
                TurnStartedEvent(
                    user_id=user.id,
                    conversation_id=request.conversation_id,
                    surface=surface,
                    model_id=model_id,
                    source="chat",
                )
            )

            async def _guarded_stream():
                """Wrap the provider stream with error capture + aggregation."""
                nonlocal event_count
                try:
                    # PR 09: forward multimodal image inputs from the
                    # request body straight to the provider.  Each
                    # provider then bridges these into its native
                    # content-block shape — Claude as `messages.content`
                    # image blocks (PR 05), Gemini as Part.from_bytes
                    # (PR 09 follow-on once the Gemini SDK wiring lands).
                    image_inputs = (
                        [{"data": img.data, "media_type": img.media_type} for img in request.images]
                        if request.images
                        else None
                    )
                    async for event in provider.stream(
                        request.question,
                        request.conversation_id,
                        user.id,
                        history=history,
                        tools=agent_tools or None,
                        system_prompt=workspace_system_prompt,
                        permission_check=permission_check_for_request,
                        images=image_inputs,
                    ):
                        event_count += 1
                        aggregator.apply(event)
                        yield event
                        # When the agent invokes ``render_artifact``, lift the
                        # spec out of the tool's input and emit a sibling
                        # ``artifact`` event for the frontend.  The tool's
                        # own result string (returned to the LLM) stays a
                        # short confirmation — the spec lives on this
                        # parallel channel so the model doesn't see it
                        # echoed back on the next turn.
                        artifact_event = _maybe_artifact_event(event)
                        if artifact_event is not None:
                            event_count += 1
                            aggregator.apply(artifact_event)
                            yield artifact_event
                        # Drain side-channel events placed by send_message
                        # tool during this iteration's tool execution.
                        while not _web_send_queue.empty():
                            side = _web_send_queue.get_nowait()
                            event_count += 1
                            aggregator.apply(side)
                            yield side
                except Exception as exc:
                    logger.exception(
                        "CHAT_ERR rid=%s conversation_id=%s model_id=%s after %d events",
                        rid,
                        request.conversation_id,
                        model_id,
                        event_count,
                    )
                    error_event: StreamEvent = {"type": "error", "content": str(exc)}
                    aggregator.apply(error_event)
                    yield error_event

            channel_message: ChannelMessage = {
                "user_id": user.id,
                "conversation_id": request.conversation_id,
                "text": request.question,
                "surface": surface,
                "model_id": model_id,
                "metadata": {},
            }

            try:
                async for chunk in channel.deliver(_guarded_stream(), channel_message):
                    yield chunk
            finally:
                duration_ms = (time.perf_counter() - stream_start) * 1000
                final_status = "failed" if aggregator.error_text else "complete"
                snapshot = aggregator.to_persisted_shape(status=final_status)
                try:
                    async with async_session_maker() as persist_session:
                        await finalize_assistant_message(
                            persist_session,
                            message_id=assistant_message_id,
                            **snapshot,
                        )
                        # Cost ledger write (PR 04). Same session as the
                        # message persist so a failed commit leaves no
                        # orphaned ledger row. Fold the aggregator's
                        # totals — providers emit one ``usage`` event
                        # per turn; the aggregator sums when there are
                        # several within one ``stream()`` call.
                        await _record_chat_turn_cost(
                            session=persist_session,
                            user_id=user.id,
                            conversation_id=request.conversation_id,
                            model_id=model_id,
                            surface=surface,
                            aggregator=aggregator,
                        )
                        await persist_session.commit()
                except Exception:
                    logger.exception(
                        "CHAT_PERSIST_ERR rid=%s message_id=%s",
                        rid,
                        assistant_message_id,
                    )
                logger.info(
                    "CHAT_OUT rid=%s conversation_id=%s model_id=%s surface=%s events=%d duration_ms=%.1f",
                    rid,
                    request.conversation_id,
                    model_id,
                    surface,
                    event_count,
                    duration_ms,
                )
                # PR 10: announce completion (success / failure both
                # surface here because the finally block runs on every
                # path).  Subscribers can react to spend, latency, etc.
                await publish_if_available(
                    TurnCompletedEvent(
                        user_id=user.id,
                        conversation_id=request.conversation_id,
                        surface=surface,
                        model_id=model_id,
                        status=final_status,
                        duration_ms=duration_ms,
                        cost_usd=aggregator.total_cost_usd,
                        source="chat",
                    )
                )

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    return router
