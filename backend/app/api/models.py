"""Public model catalog endpoint.

``GET /api/v1/models`` exposes the frozen
:mod:`app.core.models_catalog` so the frontend menu is a function of
the backend's truth.  Before this endpoint the picker hardcoded seven
model ids — including ones the backend could not serve — and silently
drifted from the factory's prefix-string dispatch.
"""

from fastapi import Depends
from fastapi.routing import APIRouter

from app.core.models_catalog import ModelEntry, default_entry, public_catalog
from app.db import User
from app.schemas import ModelEntryRead, ModelsListResponse
from app.users import current_active_user


def get_models_router() -> APIRouter:
    """Build the ``/api/v1/models`` router.

    Returns:
        An ``APIRouter`` exposing a single ``GET /`` endpoint that
        returns the public model catalog wrapped in
        :class:`ModelsListResponse`.
    """
    router = APIRouter(prefix="/api/v1/models", tags=["models"])

    @router.get("/")
    def list_models(
        _user: User = Depends(current_active_user),
    ) -> ModelsListResponse:
        """List every model the backend can serve plus the catalog default.

        Authenticated so the frontend doesn't expose the catalog to
        unauthenticated visitors; the data isn't sensitive but the
        endpoint should follow the same auth shape as every other
        ``/api/v1/*`` surface.
        """
        return ModelsListResponse(
            models=[_to_read(entry) for entry in public_catalog()],
            default_canonical_id=default_entry().canonical_id,
        )

    return router


def _to_read(entry: ModelEntry) -> ModelEntryRead:
    """Project an internal :class:`ModelEntry` onto the public schema.

    Separated so the catalog dataclass and the public Pydantic shape
    can drift if the schema needs to expose a different subset of
    fields in the future (e.g. hiding ``sdk_id`` once the frontend
    speaks only the canonical grammar).
    """
    return ModelEntryRead(
        canonical_id=entry.canonical_id,
        provider=entry.provider,
        sdk_id=entry.sdk_id,
        display_name=entry.display_name,
        short_name=entry.short_name,
        description=entry.description,
        context_window=entry.context_window,
        supports_thinking=entry.supports_thinking,
        supports_tool_use=entry.supports_tool_use,
        supports_prompt_cache=entry.supports_prompt_cache,
        default_reasoning=entry.default_reasoning,
    )
