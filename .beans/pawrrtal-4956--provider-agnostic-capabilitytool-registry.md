---
# pawrrtal-4956
title: Provider-agnostic capability/tool registry
status: todo
type: task
priority: high
tags:
    - backend
    - architecture
created_at: 2026-05-07T02:39:23Z
updated_at: 2026-05-07T02:39:23Z
---

Decouple agent capabilities (web search, virtual filesystem, future tools)
from provider implementations.

## The problem

Today, every capability needs three pieces:

1. A provider-agnostic core — `backend/app/core/tools/exa_search.py` (good).
2. **One shim per provider** — `exa_search_claude.py` (MCP server),
   `exa_search_agno.py` (Toolkit), and a future Gemini one.
3. **A boolean flag baked into every provider's config** —
   `ClaudeLLMConfig.enable_exa_search` (`backend/app/core/providers/claude_provider.py:173`)
   and the symmetric path through `factory.py:39-43`.

Adding a fourth provider, or a second capability, multiplies the surface.
Providers know about specific tools; tools know about specific providers;
the factory wires them by hand. Wrong direction.

## The shape we want

A provider does not know what tools exist. It asks a registry: "give me
the tools I should expose, in my native shape." The registry knows how
to render each registered capability for each provider.

```python
# backend/app/core/tools/capability.py  (new)
class Capability(Protocol):
    name: str                         # canonical id, e.g. "exa_search"
    description: str                  # model-facing description
    input_schema: dict[str, Any]      # JSON schema for invocation args

    async def invoke(self, **kwargs: Any) -> Any: ...

class CapabilityRegistry:
    def register(self, cap: Capability) -> None: ...
    def for_claude(self) -> ClaudeRenderResult:   # mcp_servers + allowed_tools
    def for_agno(self) -> list[Toolkit]: ...
    def for_gemini(self) -> list[FunctionDeclaration]: ...
```

Provider configs drop `enable_<capability>` flags. Providers take a
`CapabilityRegistry` (or `None`) at construction and call the matching
`for_<provider>` method when building options. `factory.py` builds the
registry once from env (`EXA_API_KEY`, future `NOTION_TOKEN`, etc.) and
passes it to whichever provider is resolved.

## Why now

Mirage virtual-filesystem proposal (chat thread, 2026-05-07) would
otherwise repeat the same per-provider plumbing for a second capability.
Fix the pattern before adding the second occupant of it.

## Files affected

- `backend/app/core/tools/capability.py` — new, protocol + registry
- `backend/app/core/tools/exa_search.py` — implement `Capability`
- `backend/app/core/tools/exa_search_claude.py` — fold into registry's
  `for_claude` renderer; file likely deleted
- `backend/app/core/tools/exa_search_agno.py` — same, into `for_agno`
- `backend/app/core/providers/claude_provider.py` — drop
  `enable_exa_search`, accept registry
- `backend/app/core/providers/agno_provider.py` — same
- `backend/app/core/providers/factory.py` — build registry, pass it down

## Acceptance

- [ ] Adding a third capability is one new file + one
      `registry.register(...)` line. No provider config touched.
- [ ] No provider imports from a per-provider tool file outside the
      renderer (no `from app.core.tools.exa_search_claude import …` in
      `claude_provider.py`).
- [ ] Existing Exa flow works end-to-end on both Claude and Agno paths.
- [ ] Tests cover: registry construction, Claude render output, Agno
      render output, capability invocation.
- [ ] `mcp_servers` + `allowed_tools` in `claude_provider.py:271-301`
      are populated from the registry, not hand-built.

## Out of scope

- Adding new capabilities (Mirage, etc.) — separate bean.
- User-facing MCP server manager (lives under Epic 7 / `pawrrtal-sady`).
- Frontend tool toggles (Epic 7).
