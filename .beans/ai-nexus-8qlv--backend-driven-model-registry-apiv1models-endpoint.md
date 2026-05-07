---
# ai-nexus-8qlv
title: Backend-driven model registry + /api/v1/models endpoint
status: todo
type: feature
priority: high
created_at: 2026-05-07T16:18:27Z
updated_at: 2026-05-07T16:18:27Z
---

## Goal

The frontend model selector currently hardcodes the list of models it shows. Replace that with a backend-driven registry exposed through ``GET /api/v1/models``, so that:

- adding a new model is a one-place change in the backend (``app/core/providers/registry.py`` or similar)
- the Telegram ``/model`` command (related bean) and the frontend selector consume the same source of truth
- per-deployment gating is centralised (e.g. only show Gemini if ``GOOGLE_API_KEY`` is set; only show Claude if Anthropic credentials are configured)

## Shape

```jsonc
GET /api/v1/models
[
  {
    "id": "gemini-3-flash-preview",
    "provider": "gemini",
    "label": "Gemini 3 Flash",
    "description": "Fastest. Recommended for most chats.",
    "available": true,                    // false ⇒ provider not configured this deploy
    "default": false,
    "supports": { "tools": true, "vision": true, "thinking": false }
  },
  ...
]
```

## Where to wire it

- Build ``app/core/providers/registry.py`` (or extend an existing registry) that owns the canonical list of ``(id, provider, label, description, capabilities)`` rows.
- ``available`` is computed from settings (``settings.google_api_key`` non-empty for gemini, etc).
- Add ``app/api/models.py`` that mounts ``GET /api/v1/models`` and returns the list. Public auth or session-protected? Start protected — gated by ``current_active_user`` like the rest of ``v1``.
- Frontend: replace the hardcoded list (look in ``frontend/features/chat/components/ModelSelectorPopover.tsx`` and ``frontend/features/chat/components/ChatComposerControls.tsx``) with a TanStack Query against the new endpoint.
- Keep the existing client constants file in place but populate it from the response — don't change every consumer's shape.

## Acceptance

- ``GET /api/v1/models`` returns a list with at least one model marked ``available: true`` in dev.
- Frontend selector renders the same list, with unavailable models disabled or hidden.
- Telegram ``/model`` command (sibling bean) lists exactly the same set.
- Adding a new model in the registry shows up in both surfaces without a frontend code change.

## Open questions

- Should this be cacheable on the client (TTL ~ 1h)? Models change rarely but per-deployment gating could change with env vars.
- Do we want a server-side default model field that the chat API uses when ``model_id`` is null?

## Todos

- [ ] Build provider registry module with capabilities + availability flags
- [ ] Add ``GET /api/v1/models`` route + Pydantic response schema
- [ ] Backend test covering availability gating (pretend ``GOOGLE_API_KEY`` is empty → ``available: false``)
- [ ] Frontend hook (``useModels``) + replace hardcoded list in selector
- [ ] Disable selector UI for unavailable models with a tooltip explaining why
- [ ] Update DESIGN.md if the selector copy changes

## Related

- ai-nexus-uppe (Telegram /model) consumes this registry
