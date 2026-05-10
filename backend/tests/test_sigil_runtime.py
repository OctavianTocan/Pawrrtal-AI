"""Tests for Grafana Sigil + OTLP bootstrap (:mod:`app.core.telemetry.sigil_runtime`)."""

from __future__ import annotations

import pytest

from app.core.telemetry import sigil_runtime


@pytest.fixture(autouse=True)
def _reset_sigil_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure each test starts from a clean telemetry module state."""

    monkeypatch.delenv("SIGIL_AUTH_TOKEN", raising=False)
    monkeypatch.delenv("SIGIL_INSTRUMENTATION_ONLY", raising=False)
    monkeypatch.delenv("SIGIL_DISABLED", raising=False)
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_ENDPOINT", raising=False)
    sigil_runtime.shutdown_sigil_runtime()
    yield
    sigil_runtime.shutdown_sigil_runtime()


def test_sigil_client_none_without_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """Without token or instrumentation-only flag, no Sigil client is constructed."""

    monkeypatch.delenv("SIGIL_AUTH_TOKEN", raising=False)
    monkeypatch.delenv("SIGIL_INSTRUMENTATION_ONLY", raising=False)
    sigil_runtime.init_sigil_runtime()
    assert sigil_runtime.get_sigil_client() is None


def test_sigil_instrumentation_only_builds_client(monkeypatch: pytest.MonkeyPatch) -> None:
    """Instrumentation-only mode uses generation export protocol ``none``."""

    monkeypatch.setenv("SIGIL_INSTRUMENTATION_ONLY", "true")
    monkeypatch.delenv("SIGIL_AUTH_TOKEN", raising=False)
    sigil_runtime.init_sigil_runtime()
    client = sigil_runtime.get_sigil_client()
    assert client is not None
    sigil_runtime.shutdown_sigil_runtime()


def test_sigil_disabled_skips_client(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SIGIL_DISABLED", "true")
    monkeypatch.setenv("SIGIL_AUTH_TOKEN", "glc_test_fake")
    sigil_runtime.init_sigil_runtime()
    assert sigil_runtime.get_sigil_client() is None
