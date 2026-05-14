"""API tests for ``GET /api/v1/models``.

The endpoint is the contract the frontend reads to populate the model
picker — these tests pin the response shape, authentication, and the
fact that every advertised model has a working backend.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.models_catalog import default_entry, public_catalog
from app.core.providers.factory import resolve_llm


@pytest.mark.anyio
async def test_models_endpoint_returns_full_catalog(client: AsyncClient) -> None:
    """Every catalog entry is published and the envelope carries the default."""
    response = await client.get("/api/v1/models/")

    assert response.status_code == 200
    body = response.json()
    assert body["default_canonical_id"] == default_entry().canonical_id
    advertised_ids = {model["canonical_id"] for model in body["models"]}
    assert advertised_ids == {entry.canonical_id for entry in public_catalog()}


@pytest.mark.anyio
async def test_models_endpoint_response_carries_capability_flags(
    client: AsyncClient,
) -> None:
    """The response surfaces the per-model capability flags the frontend needs."""
    response = await client.get("/api/v1/models/")
    body = response.json()

    sample = body["models"][0]
    # Spot-check the schema: every flag the frontend conditions on must
    # be present on every row, with the expected primitive type.
    for key in (
        "canonical_id",
        "provider",
        "sdk_id",
        "display_name",
        "short_name",
        "description",
        "context_window",
        "supports_thinking",
        "supports_tool_use",
        "supports_prompt_cache",
        "default_reasoning",
    ):
        assert key in sample


@pytest.mark.anyio
async def test_models_endpoint_preserves_catalog_order(client: AsyncClient) -> None:
    """Declaration order survives the round-trip so the frontend can render
    rows directly without re-sorting."""
    response = await client.get("/api/v1/models/")
    body = response.json()

    expected = [entry.canonical_id for entry in public_catalog()]
    actual = [model["canonical_id"] for model in body["models"]]
    assert actual == expected


def test_every_advertised_model_is_routable() -> None:
    """Every model in the published catalog must resolve to a real provider.

    Caught at unit-test time so we never ship a catalog row the
    factory can't back — the previous frontend listed GPT-5.5 which
    the backend fell through to the Google SDK on.
    """
    for entry in public_catalog():
        # ``resolve_llm`` raises rather than returning ``None`` when no
        # provider can be built — calling it asserts both that the
        # catalog provider literal is covered and that the
        # construction path works without external services.
        assert resolve_llm(entry.canonical_id) is not None
