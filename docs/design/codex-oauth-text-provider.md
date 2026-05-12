# Design: OpenAI Codex OAuth provider for GPT text models

**Status:** Proposed
**Author:** Tavi + Wretch
**Last updated:** 2026-05-12

## Summary

We already use OpenAI's Codex OAuth flow for image generation
(`backend/app/core/tools/image_gen.py`).  The same endpoint, same
auth, same wire format also serves chat text completions.  This doc
plans an `OpenAICodexProvider` that mirrors `ClaudeProvider` /
`GeminiProvider` and registers a new model prefix in `factory.py`,
so users can route `gpt-*` (or `openai-codex/*`) conversations
through the same ChatGPT-paid auth they already have configured.

## Why use Codex OAuth instead of `OPENAI_API_KEY`

- **ChatGPT subscription billing is cheaper at our usage shape**
  than per-token API key billing for casual text use.
- Users already configured Codex OAuth for image generation —
  reusing it is one less secret to manage.
- Pulls in fast-mode access on subscription plans without extra
  config.

## Confirmed wire shape

From OpenAI's documentation and our own image-gen code:

| Property        | Value                                                |
| --------------- | ---------------------------------------------------- |
| Endpoint        | `https://chatgpt.com/backend-api/codex/responses`    |
| Method          | `POST`                                               |
| Auth header     | `Authorization: Bearer <codex_oauth_token>`          |
| Token source    | `$CODEX_HOME/auth.json` → `tokens.access_token`      |
| Wire protocol   | Responses API streaming (SSE-style events)           |
| Default model   | `gpt-5.5` (matches our image-gen choice; configurable) |

**Important:** Do NOT use `api.openai.com/v1/responses`.  ChatGPT
OAuth tokens are rejected there (missing `api.responses.write`
scope).  The codex sub-path bypasses that gate — it's the same
endpoint the official Codex CLI uses.

## Implementation plan

### 1. New provider module

`backend/app/core/providers/openai_codex_provider.py`

Shape mirrors `gemini_provider.py`:

```python
class OpenAICodexProvider(LLMProvider):
    """OpenAI text-model provider routed through ChatGPT OAuth.

    Uses the Codex-specific responses endpoint
    (chatgpt.com/backend-api/codex/responses) so requests authenticate
    with the same ChatGPT OAuth token already used by image_gen.py.
    """

    def __init__(self, model_id: str, user_id: uuid.UUID | None = None):
        self.model_id = model_id  # e.g. "gpt-5.5", "openai-codex/gpt-5.5"
        self.user_id = user_id

    async def stream(
        self,
        question: str,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        history: list[Message],
        tools: list[Tool] | None,
        system_prompt: str | None,
    ) -> AsyncIterator[StreamEvent]:
        token = resolve_codex_oauth_token()  # reuse image_gen.py helper
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "https://chatgpt.com/backend-api/codex/responses",
                json=_build_request(question, history, tools, system_prompt),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                },
                timeout=180.0,
            ) as response:
                response.raise_for_status()
                async for event in _parse_sse(response):
                    yield event
```

The `resolve_codex_oauth_token()` helper already exists in
`app/core/tools/image_gen.py`; lift it into `app/core/codex_auth.py`
so the provider and tool share it.

### 2. Request payload

Strip `image_generation` from the image-gen request; everything else
is the same Responses API shape:

```python
def _build_request(question, history, tools, system_prompt):
    input_items = []
    if system_prompt:
        input_items.append({
            "type": "message",
            "role": "system",
            "content": [{"type": "input_text", "text": system_prompt}],
        })
    for msg in history:
        input_items.append({
            "type": "message",
            "role": msg["role"],
            "content": [{"type": "input_text", "text": msg["content"]}],
        })
    input_items.append({
        "type": "message",
        "role": "user",
        "content": [{"type": "input_text", "text": question}],
    })
    return {
        "model": _resolve_underlying_model(self.model_id),
        "input": input_items,
        "stream": True,
        "tools": _convert_tools_to_responses_format(tools or []),
        "store": False,
    }
```

### 3. Stream event mapping

Responses API emits typed events (`response.created`,
`response.output_text.delta`, `response.output_item.added` for
tool calls, `response.completed`, ...).  Map to our
`StreamEvent` union:

| Responses event                        | StreamEvent           |
| -------------------------------------- | --------------------- |
| `response.output_text.delta`           | `{type: "delta", content: <delta>}` |
| `response.reasoning_summary.delta`     | `{type: "thinking", content: <delta>}` |
| `response.output_item.added` (function_call) | `{type: "tool_use", name, input, tool_use_id}` |
| function call output back to us        | (no direct mapping — the agent supplies the result and we send it as `function_call_output` on the next request) |
| `response.completed`                   | end of stream         |
| `error`                                | `{type: "error", content}` |

Tool execution still happens inside our `agent_loop` because the
Responses API requires the client to supply tool results in the
next request.  Our loop already handles this for Claude + Gemini;
the codex variant just speaks Responses-shaped messages instead.

### 4. Factory wiring

`backend/app/core/providers/factory.py`:

```python
def resolve_llm(model_id: str, user_id: uuid.UUID | None = None) -> LLMProvider:
    if model_id.startswith("claude-"):
        return ClaudeProvider(model_id=model_id, user_id=user_id)
    if model_id.startswith(("gpt-", "openai-codex/")):
        return OpenAICodexProvider(model_id=model_id, user_id=user_id)
    return GeminiProvider(model_id=model_id, user_id=user_id)
```

Model catalog additions in `/api/v1/models` so the picker shows them:
`gpt-5.5`, `gpt-5.5-mini` (whatever ChatGPT Plus / Business plan
unlocks for the user).

### 5. Config

Per-user override path: workspace `.env` → `OPENAI_CODEX_OAUTH_TOKEN`
(already supported by `resolve_codex_oauth_token`).  Without an
override, the provider falls back to `$CODEX_HOME/auth.json`.  This
keeps the bring-your-own-token story consistent with image-gen.

## Out of scope (deferred)

- **API-key path.**  Users with an `OPENAI_API_KEY` can already
  route through `api.openai.com/v1/responses` via the standard
  OpenAI SDK; that's a separate provider if we want it.  Codex
  OAuth is the priority because that's the auth Tavi + Esther
  already have set up.
- **Per-message Codex routing fast-mode toggle.**  Add later.
- **Image-gen-in-text-conversation.**  Our existing
  `image_gen` tool already covers this — keep them separate.

## Risks

- **Token expiry.**  Codex OAuth tokens refresh; the Codex CLI
  refreshes them in-process.  We currently just *read* the cached
  token.  If a long-lived agent stream picks up a stale token we
  fail mid-stream.  Mitigation: catch 401 from the stream, re-read
  `auth.json` (Codex CLI might have refreshed it on a parallel
  invocation), retry once.
- **Endpoint deprecation.**  This is technically a private OpenAI
  endpoint.  It's been stable for many months and is what the
  Codex CLI itself uses, but it could break without warning.
  Mitigation: wrap with the same error envelope as other providers
  so a sudden 4xx surfaces as a normal stream error event.
- **Tool-call shape divergence.**  Responses API tool calls aren't
  identical to Anthropic's or Gemini's.  The `_claude_tool_bridge`
  pattern shows we already handle per-provider tool translation;
  add a codex bridge.

## Implementation order

1. Lift `resolve_codex_oauth_token` from `image_gen.py` to
   `core/codex_auth.py`.  No behaviour change.
2. New file: `core/providers/openai_codex_provider.py` — bare skeleton
   that just makes a non-streaming request work end-to-end with a
   single user message and no tools.
3. Add streaming + delta event mapping.
4. Add tool-call support (reuse pattern from Claude bridge).
5. Wire into `factory.py` with the new prefix.
6. Add catalog entries to `/api/v1/models`.
7. Tests: replay-based, mirroring `test_claude_provider.py`.

## Test strategy

- Unit tests with recorded request/response fixtures (vcr.py or
  hand-rolled httpx mocks).  Don't hit live Codex from CI.
- Manual smoke: Tavi runs a real conversation with his Codex token
  and confirms the stream renders correctly on web + Telegram.
