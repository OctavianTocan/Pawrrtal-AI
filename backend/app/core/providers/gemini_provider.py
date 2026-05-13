"""Google Gemini provider — StreamFn adapter for the agent loop."""

from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from google import genai
from google.genai import types as gtypes

from app.core.agent_loop import (
    AgentContext,
    AgentLoopConfig,
    AgentMessage,
    AgentTool,
    AssistantMessage,
    LLMDoneEvent,
    LLMEvent,
    LLMTextDeltaEvent,
    LLMToolCallEvent,
    StreamFn,
    UserMessage,
    agent_loop,
)
from app.core.agent_loop.safety_factory import safety_from_settings
from app.core.agent_loop.types import TextContent, ToolCallContent
from app.core.agent_system_prompt import (
    DEFAULT_AGENT_SYSTEM_PROMPT as _FALLBACK_SYSTEM_PROMPT,
)
from app.core.config import settings
from app.core.keys import resolve_api_key

from .base import StreamEvent

logger = logging.getLogger(__name__)

# `_FALLBACK_SYSTEM_PROMPT` is the system prompt this provider uses
# when *no caller supplies one*.  In production the chat router
# always supplies one (assembled from the workspace's SOUL.md +
# AGENTS.md per PR #113), so this fallback only fires for unit tests
# and direct-script callers that don't wire up the assembly
# pipeline.
#
# It's imported from `app.core.agent_system_prompt` instead of being
# a string literal here so that the Gemini and Claude providers fall
# back to the **same** constant.  Otherwise the agent's identity
# would silently change when the user switched models — which is the
# behaviour AGENTS.md was meant to make impossible.
#
# The local alias is kept for grep continuity with the previous
# in-file constant of the same name.

_GEMINI_ROLE = {"user": "user", "assistant": "model"}


def _build_gemini_tool_declarations(
    tools: list[AgentTool],
) -> list[gtypes.Tool] | None:
    """Convert AgentTools to Gemini FunctionDeclarations."""
    if not tools:
        return None
    declarations = [
        gtypes.FunctionDeclaration(
            name=t.name,
            description=t.description,
            # ``AgentTool.parameters`` is a raw JSON Schema dict; the
            # SDK's ``parameters`` field expects a ``Schema`` model
            # (Pydantic coerces a dict at runtime, mypy doesn't).
            # Validating into a Schema makes the conversion explicit.
            parameters=gtypes.Schema.model_validate(t.parameters),
        )
        for t in tools
    ]
    return [gtypes.Tool(function_declarations=declarations)]


def _build_gemini_contents(
    messages: list[AgentMessage],
) -> list[gtypes.Content]:
    """Convert AgentMessage list to Gemini Contents, oldest-first."""
    contents: list[gtypes.Content] = []
    for msg in messages:
        role = _GEMINI_ROLE.get(msg.get("role", ""), "")
        if not role:
            continue  # skip tool_result messages; Gemini uses function_response parts
        if msg["role"] in {"user", "assistant"}:
            content = msg["content"]
            if isinstance(content, str):
                text = content
            else:
                # ``content`` is a ``list[TextContent | ToolCallContent]``;
                # only TextContent has a ``text`` field. Narrow on
                # ``type == "text"`` so mypy resolves the union and
                # ``b["text"]`` types as ``str``.
                text = " ".join(b["text"] for b in content if b["type"] == "text")
            if text.strip():
                contents.append(
                    gtypes.Content(
                        role=role,
                        parts=[gtypes.Part.from_text(text=text)],
                    )
                )
    return contents


def make_gemini_stream_fn(model_id: str, user_id: uuid.UUID | None = None) -> StreamFn:
    """Build a StreamFn backed by the google-genai SDK.

    Args:
        model_id: Gemini model identifier (e.g. ``"gemini-3.1-flash-lite-preview"``).
        user_id: Authenticated user UUID, used to resolve a per-workspace
            ``GEMINI_API_KEY`` override. When ``None`` the gateway-global
            ``settings.google_api_key`` is used directly, matching
            ``ClaudeLLM``'s optional ``user_id`` contract for unauthenticated
            background work (e.g. utility agents).

    Returns:
        An async generator factory that yields ``LLMEvent``s. The generator
        is provider-specific; the calling ``agent_loop()`` is not.
    """

    async def stream_fn(
        messages: list[AgentMessage],
        tools: list[AgentTool],
    ) -> AsyncIterator[LLMEvent]:
        # Per-user override takes precedence; ``resolve_api_key`` falls back
        # to ``settings.google_api_key`` automatically when no override is
        # set, so the explicit ``or settings.google_api_key`` is dead code
        # and has been removed. For unauthenticated calls (no user_id), we
        # read the gateway global directly.
        if user_id is not None:
            api_key = resolve_api_key(user_id, "GEMINI_API_KEY")
        else:
            api_key = settings.google_api_key
        client = genai.Client(api_key=api_key)
        contents = _build_gemini_contents(messages)
        # ``GenerateContentConfig.tools`` is typed as the wider union
        # ``list[Tool | Callable | mcp.Tool | ClientSession] | None``;
        # ``list`` is invariant, so we widen the local list at this seam
        # rather than make the helper return the wide type.
        gemini_tools: list[Any] | None = _build_gemini_tool_declarations(tools)
        config = gtypes.GenerateContentConfig(
            system_instruction=_FALLBACK_SYSTEM_PROMPT,
            # Pass None (not []) when there are no tools — some SDK versions raise on empty list.
            tools=gemini_tools or None,
        )

        full_text = ""
        tool_calls: list[dict[str, Any]] = []

        try:
            # google-genai's async ``generate_content_stream`` returns
            # an awaitable that resolves to an ``AsyncIterator`` (per the
            # SDK's own docstring example). The earlier code relied on
            # the implicit-coroutine-as-iter pattern; mypy 1.x rejects it.
            stream = await client.aio.models.generate_content_stream(
                model=model_id,
                contents=contents,
                config=config,
            )
            async for chunk in stream:
                # Text delta
                if chunk.text:
                    yield LLMTextDeltaEvent(type="text_delta", text=chunk.text)
                    full_text += chunk.text

                # Tool / function calls
                if chunk.candidates:
                    for candidate in chunk.candidates:
                        if not candidate.content or not candidate.content.parts:
                            continue
                        for part in candidate.content.parts:
                            if part.function_call:
                                fc = part.function_call
                                # ``fc.name`` is typed as ``str | None`` by
                                # the SDK; the API never returns nameless
                                # function calls in practice, but we
                                # default to the empty string for typing.
                                fn_name = fc.name or ""
                                tool_call_id = f"call-{fn_name}-{len(tool_calls)}"
                                args = dict(fc.args) if fc.args else {}
                                yield LLMToolCallEvent(
                                    type="tool_call",
                                    tool_call_id=tool_call_id,
                                    name=fn_name,
                                    arguments=args,
                                )
                                tool_calls.append(
                                    {
                                        "tool_call_id": tool_call_id,
                                        "name": fn_name,
                                        "arguments": args,
                                    }
                                )

        except Exception as exc:
            # Log so the error is visible in app.log — previously swallowed silently.
            logger.error("Gemini streaming error model=%s: %s", model_id, exc, exc_info=True)
            error_text = f"Gemini error: {exc}"
            # Emit a text delta so the frontend shows the error instead of an empty bubble.
            yield LLMTextDeltaEvent(type="text_delta", text=error_text)
            yield LLMDoneEvent(
                type="done",
                stop_reason="error",
                content=[TextContent(type="text", text=error_text)],
            )
            return

        # Determine stop reason
        stop_reason = "tool_use" if tool_calls else "stop"

        content: list[TextContent | ToolCallContent] = []
        if full_text:
            content.append(TextContent(type="text", text=full_text))
        content.extend(
            ToolCallContent(
                type="toolCall",
                tool_call_id=tc["tool_call_id"],
                name=tc["name"],
                arguments=tc["arguments"],
            )
            for tc in tool_calls
        )

        yield LLMDoneEvent(type="done", stop_reason=stop_reason, content=content)

    return stream_fn


def _identity_convert(messages: list[AgentMessage]) -> list[AgentMessage]:
    """Pass through messages the LLM understands; filter UI-only types."""
    return [m for m in messages if m["role"] in {"user", "assistant", "toolResult"}]


class GeminiLLM:
    """AILLM backed by the agent_loop + a Gemini StreamFn.

    History is supplied by the caller (read from our Message table in
    chat.py).  Tools are injected per-request via the AgentContext.
    """

    def __init__(self, model_id: str, *, user_id: uuid.UUID | None = None) -> None:
        """Construct a Gemini provider.

        Args:
            model_id: Gemini model identifier.
            user_id: Authenticated user UUID, optional. When supplied, a
                per-workspace ``GEMINI_API_KEY`` override is honoured;
                otherwise the gateway-global key is used. Optional to match
                ``ClaudeLLM``'s contract for unauthenticated callers.
        """
        self._model_id = model_id
        self._stream_fn = make_gemini_stream_fn(model_id, user_id)

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        history: list[dict[str, str]] | None = None,
        tools: list[AgentTool] | None = None,
        system_prompt: str | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """Run the agent loop and translate AgentEvents → StreamEvents for the frontend.

        Args:
            question: The current user message.
            conversation_id: Used for logging; not persisted inside this method.
            user_id: Authenticated user UUID (used for logging).
            history: Prior messages oldest-first as ``{role, content}`` dicts.
            tools: Optional list of AgentTools to make available this turn
                (e.g. workspace file tools built by ``make_workspace_tools``).
            system_prompt: System prompt for this turn.  Callers should
                always supply one (the chat router does, populated from
                workspace AGENTS.md per PR #113).  When ``None`` the
                provider falls back to ``_FALLBACK_SYSTEM_PROMPT`` so a
                bare unit test or direct script call still works.
        """
        # AgentMessage is a union alias (not callable); construct the correct TypedDict by role.
        prior: list[AgentMessage] = []
        for m in history or []:
            role = m.get("role")
            content = m.get("content", "")
            if role == "user":
                prior.append(UserMessage(role="user", content=content))
            elif role == "assistant":
                prior.append(
                    AssistantMessage(
                        role="assistant",
                        content=[TextContent(type="text", text=content)],
                        stop_reason="stop",
                    )
                )

        # The chat router composes the full tool list (workspace tools,
        # web search, future capabilities) and hands it in via *tools*.
        # The provider stays tool-agnostic on purpose — see
        # `.claude/rules/architecture/no-tools-in-providers.md` and the
        # gate at `scripts/check-no-tools-in-providers.py`.
        context = AgentContext(
            system_prompt=system_prompt or _FALLBACK_SYSTEM_PROMPT,
            messages=prior,
            tools=list(tools or []),
        )
        prompt = UserMessage(role="user", content=question)
        # Safety config is read from app settings so limits are tuneable via
        # environment variables (AGENT_MAX_ITERATIONS, AGENT_MAX_WALL_CLOCK_SECONDS,
        # etc.) without a code deploy.  Defaults are conservative and appropriate
        # for the interactive chat path; raise them for long-running automations.
        config = AgentLoopConfig(
            convert_to_llm=_identity_convert,
            safety=safety_from_settings(settings),
        )

        try:
            async for event in agent_loop([prompt], context, config, self._stream_fn):
                # Narrow the AgentEvent union by its discriminant so TypedDict
                # field access types as ``str`` instead of ``object``.
                if event["type"] == "text_delta":
                    yield StreamEvent(type="delta", content=event["text"])

                elif event["type"] == "tool_call_start":
                    yield StreamEvent(
                        type="tool_use",
                        name=event["name"],
                        input={},
                        tool_use_id=event["tool_call_id"],
                    )

                elif event["type"] == "tool_result":
                    yield StreamEvent(
                        type="tool_result",
                        content=event["content"],
                        tool_use_id=event["tool_call_id"],
                    )

                elif event["type"] == "agent_terminated":
                    # Safety layer tripped — forward the structured event so
                    # the frontend can render a distinct termination notice
                    # instead of a generic error banner.  ``reason`` is the
                    # machine-readable label; ``message`` is the human copy.
                    logger.warning(
                        "AGENT_TERMINATED reason=%s details=%s",
                        event["reason"],
                        event["details"],
                    )
                    yield StreamEvent(
                        type="agent_terminated",
                        content=event["message"],
                    )

                elif event["type"] == "agent_end":
                    pass  # loop complete — chat.py sends [DONE]

        except Exception as exc:
            yield StreamEvent(type="error", content=f"Gemini provider error: {exc}")
