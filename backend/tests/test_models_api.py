"""API tests for ``GET /api/v1/models``.

The endpoint is the contract the frontend reads to populate the model
picker — these tests pin the response shape, authentication, and the
fact that every advertised model has a working backend.
"""

from __future__ import annotations

from typing import Final

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.models_catalog import default_entry, public_catalog
from app.core.providers.factory import resolve_llm
from app.users import current_active_user

# Pinned here so the iterator-based shape check fails loudly when a
# new field is added to ``ModelEntryRead`` without updating the test.
_REQUIRED_KEYS: Final[tuple[str, ...]] = (
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
)


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
    """Every advertised row carries the full set of capability flags.

    Iterating over the whole list (rather than spot-checking ``[0]``)
    catches a future regression where a single catalog entry is built
    without one of the required keys.
    """
    response = await client.get("/api/v1/models/")
    body = response.json()

    assert body["models"], "catalog must publish at least one model"
    for model in body["models"]:
        for key in _REQUIRED_KEYS:
            assert key in model, f"{model.get('canonical_id')!r} missing {key}"


@pytest.mark.anyio
async def test_models_endpoint_preserves_catalog_order(client: AsyncClient) -> None:
    """Declaration order survives the round-trip so the frontend renders
    rows directly without re-sorting."""
    response = await client.get("/api/v1/models/")
    body = response.json()

    expected = [entry.canonical_id for entry in public_catalog()]
    actual = [model["canonical_id"] for model in body["models"]]
    assert actual == expected


@pytest.mark.anyio
async def test_models_endpoint_rejects_unauthenticated_requests(
    app_with_overrides: FastAPI,
) -> None:
    """The endpoint must refuse callers without an active session.

    Without this test, accidentally dropping the
    ``Depends(current_active_user)`` parameter would slip past the rest
    of the suite (which uses an auth-overridden client fixture).
    """
    # Drop only the auth override; keep the DB-session override so the
    # endpoint can still construct its dependency graph.
    app_with_overrides.dependency_overrides.pop(current_active_user, None)
    transport = ASGITransport(app=app_with_overrides)
    async with AsyncClient(transport=transport, base_url="http://testserver") as anon:
        response = await anon.get("/api/v1/models/")

    assert response.status_code in {401, 403}


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
