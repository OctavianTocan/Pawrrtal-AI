"""Tests for Alembic migration 012 — canonicalise_conversation_model_ids.

Covers:
  - LEGACY_MODEL_ID_MAP contains all expected legacy → canonical mappings.
  - upgrade(): rewrites every legacy bare model_id to canonical host:vendor/model form.
  - upgrade(): converts empty string model_id to NULL.
  - upgrade(): leaves already-canonical values untouched.
  - upgrade(): leaves NULL values untouched.
  - downgrade(): restores canonical values back to legacy bare model names.
  - downgrade(): does NOT restore NULLs to empty strings (one-way rewrite).
  - Round-trip: upgrade then downgrade returns bare names (not NULL).

These tests run the migration SQL directly against an in-memory SQLite database
(no Alembic runner needed) so they remain hermetic and fast.

The migration file name starts with a digit (012_...) so it can't be imported
using standard ``import`` syntax. We use ``importlib.util`` to load it by path.
"""

from __future__ import annotations

import importlib.util
import sqlite3
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator, ModuleType


# ---------------------------------------------------------------------------
# Load the migration module via importlib (file name starts with a digit)
# ---------------------------------------------------------------------------

_MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "alembic" / "versions"
_MIGRATION_FILE = _MIGRATIONS_DIR / "012_canonicalise_conversation_model_ids.py"


def _load_migration() -> ModuleType:
    """Load 012_canonicalise_conversation_model_ids.py at runtime."""
    spec = importlib.util.spec_from_file_location(
        "migration_012", str(_MIGRATION_FILE)
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


_migration = _load_migration()
LEGACY_MODEL_ID_MAP: dict[str, str] = _migration.LEGACY_MODEL_ID_MAP


# ---------------------------------------------------------------------------
# SQLite test harness
# ---------------------------------------------------------------------------

_CREATE_TABLE = """
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    model_id TEXT
);
"""


@contextmanager
def _db() -> Generator[sqlite3.Connection, None, None]:
    """Yield an in-memory SQLite connection with a minimal ``conversations`` table."""
    conn = sqlite3.connect(":memory:")
    conn.execute(_CREATE_TABLE)
    conn.commit()
    yield conn
    conn.close()


def _insert(conn: sqlite3.Connection, row_id: str, model_id: str | None) -> None:
    conn.execute("INSERT INTO conversations VALUES (?, ?)", (row_id, model_id))
    conn.commit()


def _get(conn: sqlite3.Connection, row_id: str) -> str | None:
    row = conn.execute("SELECT model_id FROM conversations WHERE id = ?", (row_id,)).fetchone()
    return row[0] if row else None


class _FakeBind:
    """Minimal shim so upgrade/downgrade can call bind.execute(text, params)."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def execute(self, stmt: Any, params: dict[str, str] | None = None) -> None:
        # sqlalchemy.text wraps a string; unwrap it.
        sql = str(stmt)
        if params:
            # Convert named params (:key → ?) for sqlite3.
            ordered_values: list[str] = []
            for key, value in params.items():
                sql = sql.replace(f":{key}", "?", 1)
                ordered_values.append(value)
            self._conn.execute(sql, ordered_values)
        else:
            self._conn.execute(sql)
        self._conn.commit()


class _FakeOp:
    """Minimal Alembic ``op`` stand-in that exposes ``get_bind``."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._bind = _FakeBind(conn)

    def get_bind(self) -> _FakeBind:
        return self._bind


def _run_upgrade(conn: sqlite3.Connection) -> None:
    """Run the migration's upgrade() against ``conn``."""
    module = _load_migration()
    module.op = _FakeOp(conn)  # type: ignore[attr-defined]
    module.upgrade()


def _run_downgrade(conn: sqlite3.Connection) -> None:
    """Run the migration's downgrade() against ``conn``."""
    module = _load_migration()
    module.op = _FakeOp(conn)  # type: ignore[attr-defined]
    module.downgrade()


# ---------------------------------------------------------------------------
# LEGACY_MODEL_ID_MAP contents
# ---------------------------------------------------------------------------


def test_legacy_map_contains_all_expected_claude_keys() -> None:
    """Every Claude legacy bare model name must be in the map."""
    assert "claude-opus-4-7" in LEGACY_MODEL_ID_MAP
    assert "claude-sonnet-4-6" in LEGACY_MODEL_ID_MAP
    assert "claude-haiku-4-5" in LEGACY_MODEL_ID_MAP


def test_legacy_map_contains_all_expected_gemini_keys() -> None:
    """Every Gemini legacy bare model name must be in the map."""
    assert "gemini-3-flash-preview" in LEGACY_MODEL_ID_MAP
    assert "gemini-3.1-flash-lite-preview" in LEGACY_MODEL_ID_MAP


def test_legacy_map_canonical_values_have_host_prefix() -> None:
    """All canonical values must follow the host:vendor/model format."""
    for legacy, canonical in LEGACY_MODEL_ID_MAP.items():
        assert ":" in canonical, f"Canonical for {legacy!r} missing host prefix: {canonical!r}"
        assert "/" in canonical, f"Canonical for {legacy!r} missing vendor/model: {canonical!r}"


def test_legacy_map_claude_canonicals_use_agent_sdk_host() -> None:
    """Claude models must map to agent-sdk: host."""
    for legacy in ("claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"):
        assert LEGACY_MODEL_ID_MAP[legacy].startswith("agent-sdk:"), (
            f"Expected agent-sdk: prefix for {legacy!r}"
        )


def test_legacy_map_gemini_canonicals_use_google_ai_host() -> None:
    """Gemini models must map to google-ai: host."""
    for legacy in ("gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"):
        assert LEGACY_MODEL_ID_MAP[legacy].startswith("google-ai:"), (
            f"Expected google-ai: prefix for {legacy!r}"
        )


def test_legacy_map_has_no_duplicate_canonicals() -> None:
    """Each canonical value must be distinct (no two legacy names map to the same canonical)."""
    canonicals = list(LEGACY_MODEL_ID_MAP.values())
    assert len(canonicals) == len(set(canonicals)), "Duplicate canonical values in LEGACY_MODEL_ID_MAP"


# ---------------------------------------------------------------------------
# upgrade()
# ---------------------------------------------------------------------------


def test_upgrade_rewrites_legacy_claude_haiku() -> None:
    """upgrade() must rewrite claude-haiku-4-5 to its canonical form."""
    with _db() as conn:
        _insert(conn, "row1", "claude-haiku-4-5")
        _run_upgrade(conn)
        assert _get(conn, "row1") == LEGACY_MODEL_ID_MAP["claude-haiku-4-5"]


def test_upgrade_rewrites_legacy_claude_sonnet() -> None:
    """upgrade() must rewrite claude-sonnet-4-6."""
    with _db() as conn:
        _insert(conn, "row1", "claude-sonnet-4-6")
        _run_upgrade(conn)
        assert _get(conn, "row1") == LEGACY_MODEL_ID_MAP["claude-sonnet-4-6"]


def test_upgrade_rewrites_legacy_claude_opus() -> None:
    """upgrade() must rewrite claude-opus-4-7."""
    with _db() as conn:
        _insert(conn, "row1", "claude-opus-4-7")
        _run_upgrade(conn)
        assert _get(conn, "row1") == LEGACY_MODEL_ID_MAP["claude-opus-4-7"]


def test_upgrade_rewrites_legacy_gemini_flash_lite() -> None:
    """upgrade() must rewrite gemini-3.1-flash-lite-preview."""
    with _db() as conn:
        _insert(conn, "row1", "gemini-3.1-flash-lite-preview")
        _run_upgrade(conn)
        assert _get(conn, "row1") == LEGACY_MODEL_ID_MAP["gemini-3.1-flash-lite-preview"]


def test_upgrade_rewrites_legacy_gemini_flash() -> None:
    """upgrade() must rewrite gemini-3-flash-preview."""
    with _db() as conn:
        _insert(conn, "row1", "gemini-3-flash-preview")
        _run_upgrade(conn)
        assert _get(conn, "row1") == LEGACY_MODEL_ID_MAP["gemini-3-flash-preview"]


def test_upgrade_converts_empty_string_to_null() -> None:
    """upgrade() must set model_id to NULL when the current value is an empty string."""
    with _db() as conn:
        _insert(conn, "row1", "")
        _run_upgrade(conn)
        assert _get(conn, "row1") is None


def test_upgrade_leaves_null_model_id_untouched() -> None:
    """upgrade() must not change rows that already have NULL model_id."""
    with _db() as conn:
        _insert(conn, "row1", None)
        _run_upgrade(conn)
        assert _get(conn, "row1") is None


def test_upgrade_leaves_canonical_model_id_untouched() -> None:
    """upgrade() must not touch rows that already carry a canonical host:vendor/model value."""
    canonical = "agent-sdk:anthropic/claude-sonnet-4-6"
    with _db() as conn:
        _insert(conn, "row1", canonical)
        _run_upgrade(conn)
        assert _get(conn, "row1") == canonical


def test_upgrade_rewrites_all_legacy_ids_in_one_pass() -> None:
    """upgrade() must rewrite every entry in LEGACY_MODEL_ID_MAP in a single call."""
    with _db() as conn:
        for i, legacy in enumerate(LEGACY_MODEL_ID_MAP):
            _insert(conn, f"row{i}", legacy)

        _run_upgrade(conn)

        for i, (legacy, canonical) in enumerate(LEGACY_MODEL_ID_MAP.items()):
            result = _get(conn, f"row{i}")
            assert result == canonical, (
                f"Row {i} ({legacy!r}) was not rewritten; got {result!r}"
            )


def test_upgrade_mixed_rows() -> None:
    """upgrade() must handle a mix of legacy, canonical, NULL, and empty-string rows."""
    with _db() as conn:
        _insert(conn, "legacy", "claude-haiku-4-5")
        _insert(conn, "canonical", "agent-sdk:anthropic/claude-opus-4-7")
        _insert(conn, "null", None)
        _insert(conn, "empty", "")
        _insert(conn, "unknown", "some-future-model")

        _run_upgrade(conn)

        assert _get(conn, "legacy") == LEGACY_MODEL_ID_MAP["claude-haiku-4-5"]
        assert _get(conn, "canonical") == "agent-sdk:anthropic/claude-opus-4-7"
        assert _get(conn, "null") is None
        assert _get(conn, "empty") is None
        assert _get(conn, "unknown") == "some-future-model"


# ---------------------------------------------------------------------------
# downgrade()
# ---------------------------------------------------------------------------


def test_downgrade_restores_canonical_claude_haiku_to_legacy() -> None:
    """downgrade() must rewrite the canonical back to the bare legacy name."""
    canonical = LEGACY_MODEL_ID_MAP["claude-haiku-4-5"]
    with _db() as conn:
        _insert(conn, "row1", canonical)
        _run_downgrade(conn)
        assert _get(conn, "row1") == "claude-haiku-4-5"


def test_downgrade_restores_canonical_gemini_to_legacy() -> None:
    """downgrade() must rewrite gemini canonical back to bare legacy name."""
    canonical = LEGACY_MODEL_ID_MAP["gemini-3-flash-preview"]
    with _db() as conn:
        _insert(conn, "row1", canonical)
        _run_downgrade(conn)
        assert _get(conn, "row1") == "gemini-3-flash-preview"


def test_downgrade_does_not_restore_null_to_empty_string() -> None:
    """downgrade() must leave NULL model_id as NULL (one-way rewrite for empty strings)."""
    with _db() as conn:
        _insert(conn, "row1", None)
        _run_downgrade(conn)
        assert _get(conn, "row1") is None


def test_downgrade_restores_all_canonical_ids() -> None:
    """downgrade() must restore every canonical entry in LEGACY_MODEL_ID_MAP."""
    with _db() as conn:
        for i, (legacy, canonical) in enumerate(LEGACY_MODEL_ID_MAP.items()):
            _insert(conn, f"row{i}", canonical)

        _run_downgrade(conn)

        for i, (legacy, canonical) in enumerate(LEGACY_MODEL_ID_MAP.items()):
            result = _get(conn, f"row{i}")
            assert result == legacy, (
                f"Row {i}: expected {legacy!r} after downgrade, got {result!r}"
            )


# ---------------------------------------------------------------------------
# Round-trip: upgrade then downgrade
# ---------------------------------------------------------------------------


def test_round_trip_upgrade_then_downgrade_restores_bare_names() -> None:
    """upgrade followed by downgrade must return rows to their original legacy bare names."""
    with _db() as conn:
        for i, legacy in enumerate(LEGACY_MODEL_ID_MAP):
            _insert(conn, f"row{i}", legacy)

        _run_upgrade(conn)
        _run_downgrade(conn)

        for i, legacy in enumerate(LEGACY_MODEL_ID_MAP):
            result = _get(conn, f"row{i}")
            assert result == legacy, (
                f"Round-trip failed for {legacy!r}: got {result!r}"
            )


def test_round_trip_empty_string_becomes_null_and_stays_null() -> None:
    """An empty string survives upgrade as NULL and is not restored to '' by downgrade."""
    with _db() as conn:
        _insert(conn, "row1", "")
        _run_upgrade(conn)
        assert _get(conn, "row1") is None  # became NULL

        _run_downgrade(conn)
        assert _get(conn, "row1") is None  # stays NULL — irreversible