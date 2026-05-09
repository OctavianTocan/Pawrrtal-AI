"""Shared system-prompt fallback for the agent loop.

Tavi pushed back on per-provider system-prompt defaults: each provider
having its own default means \"who the agent is\" silently changes
based on which model the user picked, which is exactly the behaviour
the workspace AGENTS.md system prompt (PR #113) was meant to
eliminate.

The contract:

  1. The chat router assembles the **real** system prompt from
     ``SOUL.md`` + ``AGENTS.md`` at the workspace root and passes it
     to ``provider.stream(system_prompt=...)``.  This is the
     load-bearing path — every real chat turn flows through it.

  2. When that path is unavailable — a unit test calling the provider
     directly, a script-mode invocation, a freshly-onboarded user
     whose AGENTS.md hasn't been written yet — each provider falls
     back to :data:`DEFAULT_AGENT_SYSTEM_PROMPT` defined here.  One
     constant, one identity, no per-provider drift.

The fallback is intentionally thin: it identifies the surface (chat,
no shell access) and points at app-defined tools without enumerating
them, so adding/removing a tool doesn't require editing the prompt.
\"Who you are\" content lives in SOUL.md, not in this fallback.
"""

DEFAULT_AGENT_SYSTEM_PROMPT = (
    "You are an AI assistant inside a chat application.  You are "
    "speaking with the user via a text chat surface.  Be concise, "
    "helpful, and accurate.  You do NOT have shell or arbitrary "
    "filesystem access on this surface — decline politely if asked.\n\n"
    "App-defined tools (web search, workspace file access, ...) are "
    "made available on a per-turn basis when configured by the chat "
    "router.  Use whichever tools are present, and always cite any "
    "URLs returned by web-search-style tools."
)
