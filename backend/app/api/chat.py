"""Chat API — channel-routed, provider-agnostic streaming endpoint."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.channels import resolve_channel, surface_from_header
from app.channels.base import ChannelMessage
from app.core.agent_tools import build_agent_tools
from app.core.providers import resolve_llm
from app.core.providers.base import StreamEvent
from app.core.request_logging import get_request_id
from app.core.tools.artifact_agent import (
    ARTIFACT_TOOL_NAME,
    ArtifactValidationError,
    build_artifact,
)
from app.core.turn_runner import EventHook, TurnPlan, run_turn
from app.crud.conversation import (
    get_conversation_service,
    update_conversation_model_service,
)
from app.crud.workspace import get_default_workspace
from app.db import User, get_async_session
from app.schemas import ChatRequest
from app.users import current_active_user

logger = logging.getLogger(__name__)

# How many recent messages to send as context to the provider.
# Keeps token usage predictable while preserving recent turns.
_HISTORY_WINDOW = 20

_DEFAULT_MODEL = "gemini-3-flash-preview"


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


def get_chat_router() -> APIRouter:
    """Build the chat ``APIRouter`` mounted at ``/api/v1/chat``.

    Returns:
        An ``APIRouter`` exposing a single streaming ``POST /`` endpoint
        that emits Server-Sent Events from the resolved AI provider.
    """
    router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

    @router.post("/")
    async def chat(
        request: ChatRequest,
        user: User = Depends(current_active_user),
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

        # Resolve model: request overrides stored model, stored model overrides default
        model_id = request.model_id or conversation.model_id or _DEFAULT_MODEL

        # Persist model change if it differs from what is stored
        if model_id != conversation.model_id:
            await update_conversation_model_service(
                model_id=model_id,
                user_id=user.id,
                conversation_id=request.conversation_id,
                session=session,
            )

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
        if not root.exists():
            # Workspace row exists but the directory is gone (manually
            # deleted, volume wipe, etc.).  Same outcome — do not run.
            logger.error("CHAT_WORKSPACE_MISSING rid=%s user_id=%s path=%s", rid, user.id, root)
            raise HTTPException(
                status_code=412,
                detail="Workspace directory is missing on disk.  Re-run onboarding.",
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
            workspace_root=root, user_id=user.id, send_fn=_web_send_fn
        )

        # ── Per-event hooks: surface-specific event splicing ────────────
        # turn_runner.run_turn handles persistence + aggregation + delivery;
        # the chat surface adds two web-only side channels via event hooks:

        def _artifact_hook(event: StreamEvent) -> list[StreamEvent]:
            """When the agent calls ``render_artifact``, emit a sibling
            ``artifact`` event so the frontend can render it independently."""
            extra = _maybe_artifact_event(event)
            return [extra] if extra is not None else []

        def _drain_send_queue(_event: StreamEvent) -> list[StreamEvent]:
            """Drain events placed on the queue by ``send_message`` tool calls
            executed during the *previous* event's tool phase."""
            out: list[StreamEvent] = []
            while not _web_send_queue.empty():
                out.append(_web_send_queue.get_nowait())
            return out

        channel_message: ChannelMessage = {
            "user_id": user.id,
            "conversation_id": request.conversation_id,
            "text": request.question,
            "surface": surface,
            "model_id": model_id,
            "metadata": {},
        }

        plan = TurnPlan(
            conversation_id=request.conversation_id,
            user_id=user.id,
            question=request.question,
            provider=provider,
            channel=channel,
            channel_message=channel_message,
            workspace_root=root,
            tools=agent_tools,
            history_window=_HISTORY_WINDOW,
            log_tag="CHAT",
            log_extras={
                "rid": rid,
                "model_id": model_id,
                "surface": surface,
            },
        )
        hooks: list[EventHook] = [_artifact_hook, _drain_send_queue]

        async def event_stream() -> AsyncGenerator[bytes]:
            """Channel-encoded bytes for each LLM event — thin wrapper around run_turn."""
            async for chunk in run_turn(plan, event_hooks=hooks):
                yield chunk

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    return router
