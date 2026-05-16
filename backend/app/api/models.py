"""``/api/v1/models`` — exposes the backend catalog to clients."""

from __future__ import annotations

from fastapi import Depends, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from pydantic import BaseModel

from app.api.users import get_allowed_user
from app.core.db import User
from app.core.providers.catalog import CATALOG_ETAG, MODEL_CATALOG, ModelEntry

# RFC 7232 requires ``ETag`` values to be wrapped in double quotes.  The
# ``CATALOG_ETAG`` constant is a bare 16-hex string; we quote it once here
# so both the response header and the ``If-None-Match`` comparison agree.
ETAG_HEADER = f'"{CATALOG_ETAG}"'


class ModelOption(BaseModel):
    """One model returned by ``GET /api/v1/models``."""

    id: str
    host: str
    vendor: str
    model: str
    display_name: str
    short_name: str
    description: str
    is_default: bool


class ModelsResponse(BaseModel):
    """Envelope for the catalog response."""

    models: list[ModelOption]


def _to_option(entry: ModelEntry) -> ModelOption:
    return ModelOption(
        id=entry.id,
        host=entry.host.value,
        vendor=entry.vendor.value,
        model=entry.model,
        display_name=entry.display_name,
        short_name=entry.short_name,
        description=entry.description,
        is_default=entry.is_default,
    )


def get_models_router() -> APIRouter:
    """Build the ``/api/v1/models`` router.

    Returns:
        An ``APIRouter`` exposing ``GET /api/v1/models`` behind the
        standard authed-user dependency.
    """
    router = APIRouter(prefix="/api/v1/models", tags=["models"])

    @router.get("")
    def list_models(
        request: Request,
        _user: User = Depends(get_allowed_user),
    ) -> Response:
        """Return the catalog with ``ETag`` caching.

        A ``304 Not Modified`` (empty body) is returned when the
        client's ``If-None-Match`` matches the in-memory catalog
        hash. Use ``Response(status_code=304)`` rather than
        ``HTTPException(304)`` so the response has no body — FastAPI
        serialises ``HTTPException`` with a ``detail`` payload,
        which violates RFC 7232.
        """
        if request.headers.get("if-none-match") == ETAG_HEADER:
            return Response(
                status_code=status.HTTP_304_NOT_MODIFIED,
                headers={"ETag": ETAG_HEADER},
            )
        body = ModelsResponse(models=[_to_option(e) for e in MODEL_CATALOG])
        return JSONResponse(
            content=body.model_dump(),
            headers={
                "ETag": ETAG_HEADER,
                "Cache-Control": "private, must-revalidate",
            },
        )

    return router
