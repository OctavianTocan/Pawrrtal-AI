from fastapi.routing import APIRouter


def get_models_router() -> APIRouter:
    """Build the ``/api/v1/models`` router (placeholder — model list TBD)."""
    router = APIRouter(prefix="/api/v1/models", tags=["models"])

    @router.get("/")
    def get_models() -> list[str] | None:
        """Return the list of available model IDs (currently a no-op placeholder)."""
        return None

    return router
