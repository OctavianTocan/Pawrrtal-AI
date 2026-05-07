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
from app.core.agent_loop.types import TextContent, ToolCallContent
from app.core.config import settings
from .base import StreamEvent

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are a helpful AI assistant. "
    "Be concise, accurate, and thoughtful in your responses."
)

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
            parameters=t.parameters,
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
            text = (
                msg["content"]
                if isinstance(msg["content"], str)
                else " ".join(
                    b.get("text", "") for b in msg["content"] if b.get("type") == "text"
                )
            )
            if text.strip():
                contents.append(
                    gtypes.Content(
                        role=role,
                        parts=[gtypes.Part.from_text(text=text)],
                    )
                )
    return contents


def make_gemini_stream_fn(model_id: str) -> StreamFn:
    """Build a StreamFn backed by the google-genai SDK.

    Returns an async generator that yields LLMEvents.  The generator is
    provider-specific; the calling agent_loop() is not.
    """
    client = genai.Client(api_key=settings.google_api_key)

    async def stream_fn(
        messages: list[AgentMessage],
        tools: list[AgentTool],
    ) -> AsyncIterator[LLMEvent]:
        contents = _build_gemini_contents(messages)
        gemini_tools = _build_gemini_tool_declarations(tools)
        config = gtypes.GenerateContentConfig(
            system_instruction=_SYSTEM_PROMPT,
            # Pass None (not []) when there are no tools — some SDK versions raise on empty list.
            tools=gemini_tools or None,
        )

        full_text = ""
        tool_calls: list[dict[str, Any]] = []

        try:
            async for chunk in client.aio.models.generate_content_stream(
                model=model_id,
                contents=contents,
                config=config,
            ):
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
                                tool_call_id = f"call-{fc.name}-{len(tool_calls)}"
                                args = dict(fc.args) if fc.args else {}
                                yield LLMToolCallEvent(
                                    type="tool_call",
                                    tool_call_id=tool_call_id,
                                    name=fc.name,
                                    arguments=args,
                                )
                                tool_calls.append(
                                    {
                                        "tool_call_id": tool_call_id,
                                        "name": fc.name,
                                        "arguments": args,
                                    }
                                )

        except Exception as exc:
            # Log so the error is visible in app.log — previously swallowed silently.
            logger.error(
                "Gemini streaming error model=%s: %s", model_id, exc, exc_info=True
            )
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
        for tc in tool_calls:
            content.append(
                ToolCallContent(
                    type="toolCall",
                    tool_call_id=tc["tool_call_id"],
                    name=tc["name"],
                    arguments=tc["arguments"],
                )
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

    def __init__(self, model_id: str) -> None:
        self._model_id = model_id
        self._stream_fn = make_gemini_stream_fn(model_id)

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        history: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """Run the agent loop and translate AgentEvents → StreamEvents for the frontend."""
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

        context = AgentContext(
            system_prompt=_SYSTEM_PROMPT,
            messages=prior,
            tools=[],  # TODO: wire filesystem + MCP tools here
        )
        prompt = UserMessage(role="user", content=question)
        config = AgentLoopConfig(convert_to_llm=_identity_convert)

        try:
            async for event in agent_loop([prompt], context, config, self._stream_fn):
                etype = event["type"]

                if etype == "text_delta":
                    yield StreamEvent(type="delta", content=event.get("text", ""))  # type: ignore[arg-type]

                elif etype == "tool_call_start":
                    yield StreamEvent(
                        type="tool_use",
                        name=event.get("name", ""),  # type: ignore[arg-type]
                        input={},
                        tool_use_id=event.get("tool_call_id", ""),  # type: ignore[arg-type]
                    )

                elif etype == "tool_result":
                    yield StreamEvent(
                        type="tool_result",
                        content=event.get("content", ""),  # type: ignore[arg-type]
                        tool_use_id=event.get("tool_call_id", ""),  # type: ignore[arg-type]
                    )

                elif etype == "agent_end":
                    pass  # loop complete — chat.py sends [DONE]

        except Exception as exc:
            yield StreamEvent(type="error", content=f"Gemini provider error: {exc}")
