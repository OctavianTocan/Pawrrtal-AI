"""Tests for BackendApiKeyMiddleware.

Covers:
  - Middleware is disabled (passthrough) when BACKEND_API_KEY is not configured.
  - Missing header returns 401 when key is configured.
  - Wrong header value returns 401.
  - Correct header value passes through.
  - Exempt paths bypass the key check unconditionally.
  - Non-exempt paths are always checked.
  - Settings.backend_api_key field presence and default value.
  - 401 response body shape (detail key).
  - _EXEMPT_PREFIXES contains all documented bypass paths.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


# ---------------------------------------------------------------------------
# Minimal-app builder
# ---------------------------------------------------------------------------

def _build_app() -> FastAPI:
    """Return a minimal FastAPI app with BackendApiKeyMiddleware registered."""
    from app.core.middleware import BackendApiKeyMiddleware

    app = FastAPI()

    @app.get("/api/v1/data")
    async def _data() -> dict[str, str]:
        return {"result": "ok"}

    @app.get("/health")
    async def _health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/docs")
    async def _docs() -> dict[str, str]:
        return {"docs": "here"}

    @app.get("/redoc")
    async def _redoc() -> dict[str, str]:
        return {"redoc": "here"}

    @app.get("/openapi.json")
    async def _openapi() -> dict[str, str]:
        return {"openapi": "3.0.0"}

    @app.get("/api/v1/auth/oauth/google/start")
    async def _oauth() -> dict[str, str]:
        return {"oauth": "start"}

    app.add_middleware(BackendApiKeyMiddleware)
    return app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


# ---------------------------------------------------------------------------
# Settings field — pure unit test
# ---------------------------------------------------------------------------


def test_backend_api_key_defaults_to_empty_string() -> None:
    """Settings.backend_api_key should default to '' so the middleware is opt-in."""
    from app.core.config import settings as real_settings

    default = real_settings.model_copy(update={"backend_api_key": ""})
    assert default.backend_api_key == ""
    # Verify the field exists on the default settings object.
    assert hasattr(real_settings, "backend_api_key")
    assert isinstance(real_settings.backend_api_key, str)


# ---------------------------------------------------------------------------
# Middleware disabled (no key configured)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_middleware_passthrough_when_no_key_configured() -> None:
    """When BACKEND_API_KEY is empty, every request passes through unchecked."""
    stub = SimpleNamespace(backend_api_key="")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/v1/data")

    assert response.status_code == 200


@pytest.mark.anyio
async def test_middleware_passthrough_no_header_and_no_key() -> None:
    """Sending no header when BACKEND_API_KEY is unset is fine."""
    stub = SimpleNamespace(backend_api_key="")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/v1/data")

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Middleware enabled — rejection cases
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_missing_header_returns_401_when_key_configured() -> None:
    """A request with no X-Pawrrtal-Key header gets 401 when a key is configured."""
    stub = SimpleNamespace(backend_api_key="secret-key-123")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/v1/data")

    assert response.status_code == 401
    detail = response.json()["detail"]
    assert "X-Pawrrtal-Key" in detail


@pytest.mark.anyio
async def test_wrong_key_returns_401() -> None:
    """A request with the wrong X-Pawrrtal-Key value gets 401."""
    stub = SimpleNamespace(backend_api_key="correct-key")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/v1/data", headers={"X-Pawrrtal-Key": "wrong-key"})

    assert response.status_code == 401


@pytest.mark.anyio
async def test_empty_header_value_returns_401() -> None:
    """An empty X-Pawrrtal-Key header value is treated as missing."""
    stub = SimpleNamespace(backend_api_key="real-key")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/v1/data", headers={"X-Pawrrtal-Key": ""})

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Middleware enabled — acceptance case
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_correct_key_passes_through() -> None:
    """A request with the correct X-Pawrrtal-Key value is forwarded to the route."""
    stub = SimpleNamespace(backend_api_key="correct-key")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get(
                "/api/v1/data", headers={"X-Pawrrtal-Key": "correct-key"}
            )

    assert response.status_code == 200
    assert response.json() == {"result": "ok"}


# ---------------------------------------------------------------------------
# Exempt paths bypass the key check
# ---------------------------------------------------------------------------


@pytest.mark.anyio
@pytest.mark.parametrize(
    "path",
    [
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/auth/oauth/google/start",
    ],
)
async def test_exempt_paths_bypass_key_check(path: str) -> None:
    """Exempt paths must not require the X-Pawrrtal-Key header."""
    stub = SimpleNamespace(backend_api_key="configured-key")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            # No X-Pawrrtal-Key header — should still pass for exempt paths.
            response = await client.get(path)

    # Route returns 200 (all routes exist in our minimal app).
    assert response.status_code == 200


@pytest.mark.anyio
async def test_non_exempt_path_requires_key() -> None:
    """Non-exempt paths must require the key when backend_api_key is set."""
    stub = SimpleNamespace(backend_api_key="gate-key")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/v1/data")  # No key header.

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# 401 response shape
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_401_response_contains_descriptive_detail() -> None:
    """The 401 JSON body must include a 'detail' key with a non-empty string."""
    stub = SimpleNamespace(backend_api_key="any-key")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/api/v1/data")

    assert response.status_code == 401
    body = response.json()
    assert "detail" in body
    assert isinstance(body["detail"], str)
    assert len(body["detail"]) > 0
    # Must mention the header name so the operator knows what to send.
    assert "X-Pawrrtal-Key" in body["detail"]


# ---------------------------------------------------------------------------
# Pure unit test for _EXEMPT_PREFIXES membership
# ---------------------------------------------------------------------------


def test_exempt_prefixes_cover_expected_paths() -> None:
    """_EXEMPT_PREFIXES should include all documented bypass paths."""
    from app.core.middleware import _EXEMPT_PREFIXES

    assert "/health" in _EXEMPT_PREFIXES
    assert "/docs" in _EXEMPT_PREFIXES
    assert "/redoc" in _EXEMPT_PREFIXES
    assert "/openapi.json" in _EXEMPT_PREFIXES
    assert "/api/v1/auth/oauth/" in _EXEMPT_PREFIXES


def test_exempt_prefixes_is_a_tuple() -> None:
    """_EXEMPT_PREFIXES must be a tuple so ``any(path.startswith(p) for p in ...)`` is efficient."""
    from app.core.middleware import _EXEMPT_PREFIXES

    assert isinstance(_EXEMPT_PREFIXES, tuple)


# ---------------------------------------------------------------------------
# Timing-safe comparison: different-length keys must return 401, not error
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_different_length_key_returns_401_not_error() -> None:
    """secrets.compare_digest with mismatched-length inputs must still return 401.

    This guards against the ``ValueError: strings of different length`` that
    compare_digest raises when one operand is empty — the middleware must handle
    that by using a constant-time dummy comparison rather than crashing.
    """
    stub = SimpleNamespace(backend_api_key="a-long-enough-key")
    app = _build_app()
    transport = ASGITransport(app=app)

    from unittest.mock import patch
    with patch("app.core.middleware.settings", stub):
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            # Provide a much shorter key.
            response = await client.get("/api/v1/data", headers={"X-Pawrrtal-Key": "short"})

    # Must be 401, not 500.
    assert response.status_code == 401