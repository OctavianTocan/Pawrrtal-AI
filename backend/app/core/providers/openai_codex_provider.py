"""OpenAI Codex (ChatGPT subscription) text-completion provider.

⚠️ **SCAFFOLD ONLY.**  The streaming code path is implemented + unit
tested with mocked SSE fixtures, but no live calls are wired through
``factory.py`` yet.  Smoke-testing against a real Codex OAuth token
happens in a follow-up PR once Tavi confirms the wire shape end-to-end.

Why this provider exists
-------------------------
We already authenticate to ``chatgpt.com/backend-api/codex/responses``
for image generation (see ``app.core.tools.image_gen``).  The same
endpoint, same OAuth token, and same Responses API protocol also
serve text completions.  This provider lets users with a ChatGPT
Plus/Pro subscription route ``gpt-*`` traffic through their
subscription instead of paying for API-key tokens.

See ``docs/design/codex-oauth-text-provider.md`` for the full wire
spec.  Critical points enforced here:

- ``stream: true`` — backend rejects non-streaming.
- ``store: false`` — backend rejects ``store: true``.
- No ``temperature``, no ``max_output_tokens``, no
  ``previous_response_id``.
- ``originator: pawrrtal`` — using ``codex_cli_rs`` would trigger the
  backend's strict-mode trap (must match the CLI's tools + prompt.md
  byte-for-byte or 400 ``Instructions are not valid``).
- ``include: ["reasoning.encrypted_content"]`` so multi-turn replay
  of reasoning items works in a follow-up.
"""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from app.core.codex_auth import (
    CODEX_RESPONSES_URL,
    CodexAuthError,
    resolve_codex_credentials,
)
from app.core.providers.base import StreamEvent

logger = logging.getLogger(__name__)


# ── Stream timeout ──
# OpenAI's own Codex CLI reports a ~45 s idle timeout in production.
# We give the model a bit longer to start emitting tokens.
_STREAM_TIMEOUT_S = 180.0


def _build_request_body(
    *,
    model: str,
    question: str,
    history: list[dict[str, str]] | None,
    system_prompt: str | None,
    tools: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    """Assemble the JSON payload for the Codex /responses endpoint.

    Shape is the Responses API (NOT chat completions).  Each prior
    message becomes an ``input`` item with ``type: "message"`` and a
    single ``input_text`` content part.  The current question is
    appended as the final user message.

    The system prompt (assembled from SOUL.md + AGENTS.md by the chat
    router) goes in the top-level ``instructions`` field — that's the
    Responses-API equivalent of a system message.
    """
    input_items: list[dict[str, Any]] = []
    for msg in history or []:
        role = msg.get("role") or "user"
        content = msg.get("content") or ""
        if not content:
            continue
        input_items.append(
            {
                "type": "message",
                "role": role,
                "content": [{"type": "input_text", "text": content}],
            }
        )
    input_items.append(
        {
            "type": "message",
            "role": "user",
            "content": [{"type": "input_text", "text": question}],
        }
    )

    body: dict[str, Any] = {
        "model": model,
        "input": input_items,
        "stream": True,  # required by the endpoint
        "store": False,  # required by the endpoint
        "include": ["reasoning.encrypted_content"],
    }
    if system_prompt:
        body["instructions"] = system_prompt
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"
    return body


def _build_headers(*, access_token: str, account_id: str, conversation_id: uuid.UUID) -> dict[str, str]:
    """Return the exact header set the Codex backend expects.

    See ``docs/design/codex-oauth-text-provider.md`` § "Required request headers".
    Critically, ``originator`` is set to ``pawrrtal`` (NOT ``codex_cli_rs``)
    to avoid the strict-mode validation that rejects anything not
    byte-identical to the official CLI's prompt + tools.
    """
    return {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "Authorization": f"Bearer {access_token}",
        "OpenAI-Beta": "responses=experimental",
        "chatgpt-account-id": account_id,
        "originator": "pawrrtal",
        "session_id": str(uuid.uuid4()),
        "x-client-request-id": str(conversation_id),
    }


async def parse_codex_sse_stream(lines: AsyncIterator[str]) -> AsyncIterator[StreamEvent]:
    """Translate a Codex SSE event stream into our ``StreamEvent`` union.

    Public for unit-test reuse — pass an async iterator of raw SSE
    lines (``"data: {...}"`` / ``""`` separator) and yield mapped
    ``StreamEvent`` dicts.

    Mapping (see design doc § "Stream event handling"):
      * ``response.output_text.delta``       → ``{type: "delta", content}``
      * ``response.reasoning_summary.delta`` → ``{type: "thinking", content}``
      * ``response.output_item.added`` + function_call → ``{type: "tool_use", name, input, tool_use_id}``
      * ``response.function_call_arguments.delta``    → buffer per tool_use_id
      * ``response.function_call_arguments.done``     → re-emit tool_use with parsed input
      * ``error`` → ``{type: "error", content}``
      * ``response.completed`` / ``[DONE]`` → end of stream
    """
    # Per-call_id buffer of streamed function-call arguments.
    fn_arg_buffers: dict[str, str] = {}

    async for raw in lines:
        line = raw.rstrip("\n")
        if not line.startswith("data: "):
            continue
        payload = line[6:]
        if payload == "[DONE]":
            return
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            logger.warning("openai_codex: skipping malformed SSE line: %r", payload[:120])
            continue

        event_type = data.get("type")

        if event_type == "response.output_text.delta":
            delta = data.get("delta") or ""
            if delta:
                yield StreamEvent(type="delta", content=delta)
            continue

        if event_type == "response.reasoning_summary.delta":
            delta = data.get("delta") or ""
            if delta:
                yield StreamEvent(type="thinking", content=delta)
            continue

        if event_type == "response.output_item.added":
            item = data.get("item") or {}
            if item.get("type") == "function_call":
                call_id = str(item.get("call_id") or item.get("id") or "")
                fn_arg_buffers[call_id] = ""
                # Emit a tool_use with an empty input — caller can update
                # it on the matching ``arguments.done`` event below.
                yield StreamEvent(
                    type="tool_use",
                    name=str(item.get("name") or ""),
                    input={},
                    tool_use_id=call_id,
                )
            continue

        if event_type == "response.function_call_arguments.delta":
            call_id = str(data.get("item_id") or "")
            fn_arg_buffers[call_id] = fn_arg_buffers.get(call_id, "") + (
                data.get("delta") or ""
            )
            continue

        if event_type == "response.function_call_arguments.done":
            call_id = str(data.get("item_id") or "")
            raw_args = fn_arg_buffers.pop(call_id, data.get("arguments") or "{}")
            try:
                parsed_input: dict[str, Any] = json.loads(raw_args) if raw_args else {}
            except json.JSONDecodeError:
                logger.warning(
                    "openai_codex: tool call %s has malformed JSON arguments: %r",
                    call_id,
                    raw_args[:120],
                )
                parsed_input = {}
            yield StreamEvent(
                type="tool_use",
                name=str(data.get("name") or ""),
                input=parsed_input,
                tool_use_id=call_id,
            )
            continue

        if event_type == "error":
            error_obj = data.get("error") or {}
            message = (
                error_obj.get("message")
                or data.get("message")
                or "Unknown Codex stream error"
            )
            yield StreamEvent(type="error", content=str(message))
            continue

        if event_type == "response.completed":
            # The final event carries the full response.output list,
            # including reasoning items with encrypted_content that the
            # next turn should replay.  Multi-turn replay handling lives
            # in a follow-up — for now we just terminate cleanly.
            return


class OpenAICodexLLM:
    """Streaming text-completion provider routed through ChatGPT OAuth.

    Implements the same protocol as ``ClaudeLLM`` / ``GeminiLLM``.
    The actual HTTP transport is **not** wired in this PR — only the
    request body, header set, and SSE parser are implemented + tested.
    Activation happens in a follow-up PR once Tavi confirms the wire
    shape against a real token.
    """

    def __init__(self, model: str, *, user_id: uuid.UUID | None = None) -> None:
        # Strip an "openai-codex/" prefix when the model id carries one
        # so the wire model is always the bare id the backend expects.
        if model.startswith("openai-codex/"):
            model = model.removeprefix("openai-codex/")
        self.model = model
        self.user_id = user_id

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        history: list[dict[str, str]] | None = None,
        tools: list[Any] | None = None,
        system_prompt: str | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """Streaming entry point.  Currently raises until activation.

        See ``docs/design/codex-oauth-text-provider.md`` § "Implementation
        order" — steps 5–10 cover the activation work (factory wiring,
        retry/refresh, multi-turn reasoning replay, models endpoint
        catalog).  Until then the scaffold proves the body + header +
        SSE mapping in isolation.
        """
        del user_id, conversation_id, question, history, tools, system_prompt
        try:
            resolve_codex_credentials()
        except CodexAuthError:
            # Don't even probe the file when we know we're not going to
            # call the network.  The check is here so a manual
            # `provider.stream()` from a REPL exits with a helpful
            # error rather than silently yielding nothing.
            pass
        raise NotImplementedError(
            "OpenAICodexLLM is a scaffold.  Wire it into factory.py + add the "
            "live HTTP path in a follow-up PR (see "
            "docs/design/codex-oauth-text-provider.md)."
        )
        # Unreachable, but keeps the function an async generator for typing.
        yield StreamEvent(type="error", content="unreachable")  # pragma: no cover
