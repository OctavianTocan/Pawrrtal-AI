"""Tests for ``GET /api/v1/models``."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.providers.catalog import CATALOG_ETAG, MODEL_CATALOG

# RFC 7232 mandates that ETag values are quoted.
QUOTED_ETAG = f'"{CATALOG_ETAG}"'


@pytest.mark.anyio
async def test_models_endpoint_returns_catalog(client: AsyncClient) -> None:
    response = await client.get("/api/v1/models")
    assert response.status_code == 200
    body = response.json()
    assert "models" in body
    assert len(body["models"]) == len(MODEL_CATALOG)
    first = body["models"][0]
    for key in ("id", "host", "vendor", "model", "display_name", "is_default"):
        assert key in first


@pytest.mark.anyio
async def test_models_endpoint_sets_etag(client: AsyncClient) -> None:
    response = await client.get("/api/v1/models")
    assert response.headers["etag"] == QUOTED_ETAG
    assert "private" in response.headers["cache-control"]


@pytest.mark.anyio
async def test_models_endpoint_returns_304_when_etag_matches(
    client: AsyncClient,
) -> None:
    response = await client.get(
        "/api/v1/models",
        headers={"If-None-Match": QUOTED_ETAG},
    )
    assert response.status_code == 304
    assert response.content == b""  # 304 must have empty body


@pytest.mark.anyio
async def test_default_entry_present(client: AsyncClient) -> None:
    response = await client.get("/api/v1/models")
    defaults = [m for m in response.json()["models"] if m["is_default"]]
    assert len(defaults) == 1
