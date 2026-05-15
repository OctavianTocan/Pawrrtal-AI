"""Tests for BackendApiKeyMiddleware.

Covers:
  - Pass-through when BACKEND_API_KEY is not configured.
  - Exempt paths bypass the key check.
  - 401 for requests missing the X-Pawrrtal-Key header.
  - 401 for requests with an incorrect key.
  - Pass-through for requests with the correct key.
  - 401 response body shape.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from app.core.middleware import BackendApiKeyMiddleware, _EXEMPT_PREFIXES


def _build_app() -> Starlette:
    """Minimal Starlette app that exercises BackendApiKeyMiddleware in isolation."""

    async def _protected(request):  # noqa: ANN001
        return JSONResponse({"ok": True})

    async def _health(request):  # noqa: ANN001
        return JSONResponse({"status": "ok"})

    async def _docs(request):  # noqa: ANN001
        return JSONResponse({"docs": True})

    async def _oauth_start(request):  # noqa: ANN001
        return JSONResponse({"oauth": True})

    app = Starlette(
        routes=[
            Route("/api/v1/chat/", _protected, methods=["POST"]),
            Route("/health", _health, methods=["GET"]),
            Route("/docs", _docs, methods=["GET"]),
            Route("/redoc", _docs, methods=["GET"]),
            Route("/openapi.json", _docs, methods=["GET"]),
            Route("/api/v1/auth/oauth/google", _oauth_start, methods=["GET"]),
        ],
    )
    app.add_middleware(BackendApiKeyMiddleware)
    return app


_CONFIGURED_KEY = "test-secret-api-key-abc123"


# ---------------------------------------------------------------------------
# Key not configured → all requests pass through
# ---------------------------------------------------------------------------


def test_no_key_configured_lets_all_requests_through() -> None:
    """When BACKEND_API_KEY is empty, the middleware is effectively disabled."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = ""
        with TestClient(_build_app()) as client:
            # No header needed.
            response = client.post("/api/v1/chat/")
            assert response.status_code == 200


def test_no_key_configured_lets_multiple_requests_through() -> None:
    """Multiple distinct requests all pass without a key when not configured."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = ""
        with TestClient(_build_app()) as client:
            for _ in range(5):
                response = client.post("/api/v1/chat/")
                assert response.status_code == 200


# ---------------------------------------------------------------------------
# Exempt paths bypass the key check
# ---------------------------------------------------------------------------


def test_health_path_is_exempt() -> None:
    """/health is reachable without a key even when BACKEND_API_KEY is set."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.get("/health")
            assert response.status_code == 200


def test_docs_path_is_exempt() -> None:
    """/docs is reachable without a key even when BACKEND_API_KEY is set."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.get("/docs")
            assert response.status_code == 200


def test_redoc_path_is_exempt() -> None:
    """/redoc is reachable without a key even when BACKEND_API_KEY is set."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.get("/redoc")
            assert response.status_code == 200


def test_openapi_json_path_is_exempt() -> None:
    """/openapi.json is reachable without a key even when BACKEND_API_KEY is set."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.get("/openapi.json")
            assert response.status_code == 200


def test_oauth_start_path_is_exempt() -> None:
    """/api/v1/auth/oauth/ prefix is exempt so browser-initiated OAuth works."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.get("/api/v1/auth/oauth/google")
            assert response.status_code == 200


# ---------------------------------------------------------------------------
# Protected paths require the key
# ---------------------------------------------------------------------------


def test_missing_key_header_returns_401() -> None:
    """A request with no X-Pawrrtal-Key header is rejected with 401."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.post("/api/v1/chat/")
            assert response.status_code == 401


def test_wrong_key_returns_401() -> None:
    """A request with an incorrect X-Pawrrtal-Key value is rejected with 401."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.post(
                "/api/v1/chat/",
                headers={"X-Pawrrtal-Key": "wrong-key"},
            )
            assert response.status_code == 401


def test_correct_key_passes_through() -> None:
    """A request with the correct X-Pawrrtal-Key header is allowed through."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.post(
                "/api/v1/chat/",
                headers={"X-Pawrrtal-Key": _CONFIGURED_KEY},
            )
            assert response.status_code == 200


def test_401_response_has_detail_field() -> None:
    """The 401 JSON body includes a human-readable ``detail`` message."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.post("/api/v1/chat/")
            assert response.status_code == 401
            body = response.json()
            assert "detail" in body
            assert "X-Pawrrtal-Key" in body["detail"]


def test_401_body_mentions_api_key() -> None:
    """The 401 error body mentions the API key concept so clients know how to fix it."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = _CONFIGURED_KEY
        with TestClient(_build_app()) as client:
            response = client.post(
                "/api/v1/chat/",
                headers={"X-Pawrrtal-Key": "bad-value"},
            )
            assert response.status_code == 401
            detail = response.json()["detail"]
            assert "api key" in detail.lower()


# ---------------------------------------------------------------------------
# Empty-string key edge case (treated as disabled)
# ---------------------------------------------------------------------------


def test_empty_string_key_is_treated_as_disabled() -> None:
    """An all-whitespace or genuinely empty key disables the check."""
    with patch("app.core.middleware.settings") as mock_settings:
        mock_settings.backend_api_key = ""
        with TestClient(_build_app()) as client:
            # No header provided — still passes.
            response = client.post("/api/v1/chat/")
            assert response.status_code == 200


# ---------------------------------------------------------------------------
# _EXEMPT_PREFIXES sanity check
# ---------------------------------------------------------------------------


def test_exempt_prefixes_contains_expected_paths() -> None:
    """The exempt prefix list covers the documented health + docs + OAuth paths."""
    assert "/health" in _EXEMPT_PREFIXES
    assert "/docs" in _EXEMPT_PREFIXES
    assert "/redoc" in _EXEMPT_PREFIXES
    assert "/openapi.json" in _EXEMPT_PREFIXES
    assert "/api/v1/auth/oauth/" in _EXEMPT_PREFIXES