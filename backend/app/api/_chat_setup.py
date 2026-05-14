"""Chat-turn setup service — extracts everything ``chat.py`` needs before
opening the provider stream into one helper module.

This exists so :mod:`app.api.chat` stays under sentrux's
``no_god_files`` fan-out budget.  Splitting along the natural seam —
"prepare the turn" vs "stream the turn" — keeps both halves obvious:
``chat.py`` is the FastAPI route + streaming orchestration, this module
is the synchronous I/O that resolves what to stream.

The helper takes the request + DB session and returns a
:class:`ChatTurnContext` carrying every value the route needs to open
the stream — model id, reasoning level, history slice, workspace root,
agent tools, system prompt, and the assistant placeholder id used for
the post-stream UPDATE.

Belongs in ``be-api`` (sentrux order 1) because it consumes ``be-crud``
(order 2), ``be-models`` (order 3), and ``be-core`` (order 4) — all
lower-order layers per the project's layering rule.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.agent_loop.types import AgentTool
from app.core.agent_tools import build_agent_tools
from app.core.models_catalog import canonicalise, default_entry, resolve_entry
from app.core.prompt_cache import compute_prompt_cache_key, log_prompt_cache_key
from app.core.providers.base import ReasoningEffort
from app.core.tools.agents_md import assemble_workspace_prompt
from app.crud.workspace import get_default_workspace
from app.crud.chat_message import (
    append_assistant_placeholder,
    append_user_message,
    get_messages_for_conversation,
)
from app.crud.conversation import (
    get_conversation_service,
    update_conversation_model_service,
)
from app.schemas import ChatRequest

logger = logging.getLogger(__name__)

# How many recent messages to send as context to the provider.
# Keeps token usage predictable while preserving recent turns.
_HISTORY_WINDOW = 20


@dataclass(frozen=True, slots=True)
class ChatTurnContext:
    """Snapshot of everything :func:`app.api.chat.chat` needs to stream.

    Every field is required so the chat route never has to re-check
    ``None`` after calling :func:`prepare_chat_turn` — the helper either
    returns a fully-populated context or raises an ``HTTPException``.
    """

    model_id: str
    """Canonical ``"<provider>/<model>"`` id picked for this turn."""

    reasoning_effort: ReasoningEffort | None
    """Reasoning effort to forward to the provider; ``None`` lets the
    provider use its adaptive default (and is also what non-thinking
    models always get)."""

    history: list[dict[str, str]]
    """Prior user/assistant turns, oldest-first, in the
    ``{"role": ..., "content": ...}`` shape the providers expect."""

    workspace_root: Path
    """Filesystem path to the user's default workspace.  Tool builders
    scope their operations to this directory."""

    agent_tools: list[AgentTool]
    """Provider-neutral tool list composed for this turn (workspace
    files, optional Exa web search, …)."""

    system_prompt: str | None
    """Workspace-assembled system prompt (``SOUL.md`` + ``AGENTS.md``).
    ``None`` when both files are missing; providers then fall back to
    their built-in defaults."""

    assistant_message_id: uuid.UUID
    """Database id of the assistant placeholder row inserted up front
    so a client that disconnects mid-stream still has a record to
    UPDATE on finalisation."""


async def prepare_chat_turn(
    request: ChatRequest,
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    rid: str | None,
) -> ChatTurnContext:
    """Resolve every per-turn fact for a chat request.

    Raises :class:`fastapi.HTTPException` (404 conversation missing,
    412 workspace missing) — the route layer surfaces those directly
    to the client.

    The function mutates the DB (persists the user message + assistant
    placeholder, updates ``Conversation.model_id``) but does **not**
    commit; the caller commits before opening the streaming response
    so the request-scoped session is closed cleanly while the stream
    generator runs in its own short-lived session.

    Args:
        request: The validated chat request.
        session: Active request-scoped DB session.
        user_id: Authenticated user UUID.
        rid: Request id from :mod:`app.core.request_logging` for log
            correlation.  Optional so non-HTTP callers can pass ``None``.

    Returns:
        A fully-populated :class:`ChatTurnContext`.
    """
    conversation = await _require_conversation(session, user_id, request.conversation_id, rid)
    model_id = await _resolve_and_persist_model(request, conversation, session, user_id)
    history = await _load_history(session, request.conversation_id)
    assistant_message_id = await _persist_turn_rows(session, request, user_id)
    workspace_root = await _require_workspace_root(session, user_id, rid)
    agent_tools = build_agent_tools(workspace_root=workspace_root)
    system_prompt = _build_system_prompt(
        workspace_root, rid, user_id, request.conversation_id, model_id
    )
    return ChatTurnContext(
        model_id=model_id,
        reasoning_effort=_resolve_reasoning_effort(request.reasoning_effort, model_id),
        history=history,
        workspace_root=workspace_root,
        agent_tools=agent_tools,
        system_prompt=system_prompt,
        assistant_message_id=assistant_message_id,
    )


async def _require_conversation(
    session: AsyncSession,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    rid: str | None,
):
    """Fetch the conversation or raise a 404.

    Splitting this branch out keeps :func:`prepare_chat_turn` flat
    (one level of nesting) and gives the 404 log line its own narrow
    scope.
    """
    conversation = await get_conversation_service(user_id, session, conversation_id)
    if conversation is None:
        logger.warning(
            "CHAT_404 rid=%s user_id=%s conversation_id=%s",
            rid,
            user_id,
            conversation_id,
        )
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


async def _resolve_and_persist_model(
    request: ChatRequest,
    conversation,
    session: AsyncSession,
    user_id: uuid.UUID,
) -> str:
    """Pick the model for this turn and persist it on the conversation.

    Precedence: request override → conversation's stored value →
    catalog default.  Whatever spelling the caller used (canonical
    ``"<provider>/<model>"`` or a legacy bare SDK id) is normalised via
    :func:`canonicalise` so :class:`Conversation.model_id` converges on
    the canonical form on its next write.
    """
    requested = request.model_id or conversation.model_id
    model_id = canonicalise(requested) or default_entry().canonical_id
    if model_id != conversation.model_id:
        await update_conversation_model_service(
            model_id=model_id,
            user_id=user_id,
            conversation_id=request.conversation_id,
            session=session,
        )
    return model_id


def _resolve_reasoning_effort(
    requested: ReasoningEffort | None,
    model_id: str,
) -> ReasoningEffort | None:
    """Pick the reasoning effort for this turn.

    Honours the request value on thinking-capable models; silently
    drops it on models without extended thinking so the Gemini path
    never pretends it received a thinking budget.  Returning ``None``
    lets the provider's adaptive default apply.
    """
    if requested is None:
        return None
    entry = resolve_entry(model_id)
    if entry is None or not entry.supports_thinking:
        return None
    return requested


async def _load_history(
    session: AsyncSession,
    conversation_id: uuid.UUID,
) -> list[dict[str, str]]:
    """Read the recent message slice *before* persisting the new turn.

    The current user message is excluded from history because the
    provider receives it separately as ``question``; including it here
    would duplicate the input.
    """
    recent_rows = await get_messages_for_conversation(
        session, conversation_id, limit=_HISTORY_WINDOW
    )
    return [
        {"role": row.role, "content": row.content or ""}
        for row in recent_rows
        if row.role in {"user", "assistant"}
    ]


async def _persist_turn_rows(
    session: AsyncSession,
    request: ChatRequest,
    user_id: uuid.UUID,
) -> uuid.UUID:
    """Insert the user message + assistant placeholder up front.

    Persisting both rows before the stream opens means a client that
    disconnects mid-response still has a partial record to inspect.
    Returns the assistant placeholder id so the stream finaliser can
    UPDATE it once the turn completes.
    """
    await append_user_message(
        session,
        conversation_id=request.conversation_id,
        user_id=user_id,
        content=request.question,
    )
    assistant_row = await append_assistant_placeholder(
        session,
        conversation_id=request.conversation_id,
        user_id=user_id,
    )
    return assistant_row.id


async def _require_workspace_root(
    session: AsyncSession,
    user_id: uuid.UUID,
    rid: str | None,
) -> Path:
    """Resolve the user's default workspace path or raise 412.

    The workspace is created during onboarding, so its absence means
    the user hasn't completed onboarding yet — the chat route returns
    412 Precondition Failed so the frontend can route to the
    onboarding flow instead of pretending we shipped a degraded reply.
    """
    workspace = await get_default_workspace(user_id, session)
    if workspace is None:
        raise HTTPException(
            status_code=412,
            detail="Onboarding not completed: no default workspace exists for this user.",
        )
    root = Path(workspace.path)
    if not root.exists():
        # Workspace row exists but the directory is gone (manually
        # deleted, volume wipe, etc.).  Same outcome — do not run.
        logger.error("CHAT_WORKSPACE_MISSING rid=%s user_id=%s path=%s", rid, user_id, root)
        raise HTTPException(
            status_code=412,
            detail="Workspace directory is missing on disk.  Re-run onboarding.",
        )
    return root


def _build_system_prompt(
    workspace_root: Path,
    rid: str | None,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    model_id: str,
) -> str | None:
    """Assemble the workspace system prompt and log its cache key.

    Either ``SOUL.md`` or ``AGENTS.md`` may be missing independently;
    :func:`assemble_workspace_prompt` returns ``None`` only when both
    are absent, in which case the provider falls back to its built-in
    default.

    The cache-key log line is emitted on *every* turn so a
    non-deterministic prompt assembler shows up as a flipping
    ``cache_key`` in the structured logs — the failure mode that
    silently busts Anthropic prompt caching.
    """
    system_prompt = assemble_workspace_prompt(workspace_root)
    log_prompt_cache_key(
        logger,
        rid=rid,
        conversation_id=conversation_id,
        cache_key=compute_prompt_cache_key(system_prompt=system_prompt, model_id=model_id),
        system_prompt_chars=len(system_prompt or ""),
    )
    if system_prompt is not None:
        logger.debug(
            "CHAT_WORKSPACE_PROMPT rid=%s user_id=%s chars=%d",
            rid,
            user_id,
            len(system_prompt),
        )
    return system_prompt
