"""Chat API — channel-routed, provider-agnostic streaming endpoint."""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncGenerator

from fastapi import Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from pathlib import Path

from app.channels import resolve_channel, surface_from_header
from app.core.chat_aggregator import ChatTurnAggregator
from app.core.agent_tools import build_agent_tools
from app.core.providers import resolve_llm
from app.core.providers.base import StreamEvent
from app.core.tools.agents_md import assemble_workspace_prompt
from app.core.tools.artifact_agent import (
    ARTIFACT_TOOL_NAME,
    ArtifactValidationError,
    build_artifact,
)
from app.crud.workspace import get_default_workspace
from app.core.request_logging import get_request_id
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
from app.db import User, async_session_maker, get_async_session
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

        conversation = await get_conversation_service(
            user.id, session, request.conversation_id
        )
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
        if not root.exists():
            # Workspace row exists but the directory is gone (manually
            # deleted, volume wipe, etc.).  Same outcome — do not run.
            logger.error(
                "CHAT_WORKSPACE_MISSING rid=%s user_id=%s path=%s", rid, user.id, root
            )
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
        agent_tools = build_agent_tools(workspace_root=root, user_id=user.id)

        # Load SOUL.md + AGENTS.md from the workspace as the agent's
        # system prompt.  The workspace is guaranteed by the 412 gate
        # above, so this is a single line — no extra nesting and no
        # duplicated path resolution.  Either file may be missing
        # independently; ``assemble_workspace_prompt`` returns ``None``
        # only when both are absent, in which case the provider falls
        # back to its built-in default.
        workspace_system_prompt = assemble_workspace_prompt(root)
        if workspace_system_prompt is not None:
            logger.debug(
                "CHAT_WORKSPACE_PROMPT rid=%s user_id=%s chars=%d",
                rid,
                user.id,
                len(workspace_system_prompt),
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

            async def _guarded_stream():
                """Wrap the provider stream with error capture + aggregation."""
                nonlocal event_count
                try:
                    async for event in provider.stream(
                        request.question,
                        request.conversation_id,
                        user.id,
                        history=history,
                        tools=agent_tools or None,
                        system_prompt=workspace_system_prompt,
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

            from app.channels.base import ChannelMessage  # noqa: PLC0415

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

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    return router
