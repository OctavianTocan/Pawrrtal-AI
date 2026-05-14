"""Single source of truth for which models pawrrtal supports.

Catalog entries carry the canonical ``host:vendor/model`` identity
plus display metadata. Adding a model is a one-file change here.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass

from .model_id import (
    Host,
    InvalidModelId,  # noqa: F401  # re-exported in docstring contract; raised via parse_model_id
    ParsedModelId,
    UnknownModelId,
    Vendor,
    parse_model_id,
)


@dataclass(frozen=True, slots=True)
class ModelEntry:
    """One supported model.

    The ``id`` property is the canonical wire form used by the API,
    DB, logs, and frontend.
    """

    host: Host
    vendor: Vendor
    model: str
    display_name: str
    short_name: str
    description: str
    is_default: bool

    @property
    def id(self) -> str:
        """Canonical wire string: ``host:vendor/model``."""
        return f"{self.host.value}:{self.vendor.value}/{self.model}"


MODEL_CATALOG: tuple[ModelEntry, ...] = (
    ModelEntry(
        host=Host.agent_sdk,
        vendor=Vendor.anthropic,
        model="claude-opus-4-7",
        display_name="Claude Opus 4.7",
        short_name="Claude Opus 4.7",
        description="Most capable for ambitious work",
        is_default=False,
    ),
    ModelEntry(
        host=Host.agent_sdk,
        vendor=Vendor.anthropic,
        model="claude-sonnet-4-6",
        display_name="Claude Sonnet 4.6",
        short_name="Claude Sonnet 4.6",
        description="Balanced for everyday tasks",
        is_default=False,
    ),
    ModelEntry(
        host=Host.agent_sdk,
        vendor=Vendor.anthropic,
        model="claude-haiku-4-5",
        display_name="Claude Haiku 4.5",
        short_name="Claude Haiku 4.5",
        description="Fastest for quick answers",
        is_default=False,
    ),
    ModelEntry(
        host=Host.google_ai,
        vendor=Vendor.google,
        model="gemini-3-flash-preview",
        display_name="Gemini 3 Flash Preview",
        short_name="Gemini 3 Flash",
        description="Google's frontier multimodal",
        is_default=True,
    ),
    ModelEntry(
        host=Host.google_ai,
        vendor=Vendor.google,
        model="gemini-3.1-flash-lite-preview",
        display_name="Gemini 3.1 Flash Lite Preview",
        short_name="Gemini Flash Lite",
        description="Light and fast Gemini",
        is_default=False,
    ),
)


# Module-import-time invariant: exactly one default.
# Explicit raise (not ``assert``) so ``python -O`` cannot strip it.
_default_count = sum(1 for e in MODEL_CATALOG if e.is_default)
if _default_count != 1:
    raise ValueError(f"MODEL_CATALOG must have exactly one default; found {_default_count}")


def _hash_catalog(catalog: tuple[ModelEntry, ...]) -> str:
    """Stable hash of the catalog used as the HTTP ``ETag`` value."""
    payload = json.dumps(
        [asdict(e) for e in catalog],
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


CATALOG_ETAG: str = _hash_catalog(MODEL_CATALOG)
"""Catalog hash, computed once at import. Exposed via the ``ETag``
response header so clients can revalidate cheaply with
``If-None-Match``."""


def default_model() -> ModelEntry:
    """Return the entry marked ``is_default=True``.

    Returns:
        The single default entry. The module-import-time invariant
        guarantees exactly one exists.
    """
    return next(e for e in MODEL_CATALOG if e.is_default)


def find(parsed: ParsedModelId) -> ModelEntry | None:
    """Look up a catalog entry by parsed identifier.

    Args:
        parsed: Pre-parsed identifier (callers go through
            :func:`parse_model_id` first).

    Returns:
        The matching :class:`ModelEntry` or ``None``.
    """
    for entry in MODEL_CATALOG:
        if (
            entry.host is parsed.host
            and entry.vendor is parsed.vendor
            and entry.model == parsed.model
        ):
            return entry
    return None


def is_known(parsed: ParsedModelId) -> bool:
    """Return whether ``parsed`` is in :data:`MODEL_CATALOG`."""
    return find(parsed) is not None


def require_known(model_id: str) -> ModelEntry:
    """Parse ``model_id`` and look it up; raise on either failure.

    Args:
        model_id: Wire-form model identifier (any of the accepted
            input shapes — see :func:`parse_model_id`).

    Returns:
        The catalog entry.

    Raises:
        InvalidModelId: If the string fails to parse.
        UnknownModelId: If the string parses but isn't in the
            catalog.
    """
    parsed = parse_model_id(model_id)
    entry = find(parsed)
    if entry is None:
        raise UnknownModelId(f"model not in catalog: {parsed.id}")
    return entry
