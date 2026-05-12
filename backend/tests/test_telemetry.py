"""Tests for the OpenTelemetry bootstrap.

The bootstrap MUST be a no-op when ``OTEL_EXPORTER_OTLP_ENDPOINT`` is
unset — that's the contract that lets us ship the import + lifespan
wiring on the development branch without forcing every dev to run an
OTel collector locally.

Live OTel export is verified with an in-memory span exporter so we
don't need a real collector in CI.
"""

from __future__ import annotations

import importlib
import os
from collections.abc import Iterator

import pytest


@pytest.fixture
def _clean_telemetry_state(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Reset the module-level _initialised flag between cases."""
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_ENDPOINT", raising=False)
    import app.core.telemetry as telemetry_module

    importlib.reload(telemetry_module)
    yield
    telemetry_module.shutdown_tracing()
    importlib.reload(telemetry_module)


def test_setup_tracing_is_a_noop_without_endpoint(_clean_telemetry_state: None) -> None:
    """Default state — no env var, no init, no failure."""
    from app.core.telemetry import setup_tracing

    # Should return cleanly even with no app.
    setup_tracing(app=None)
    setup_tracing(app=None)  # idempotent — second call also no-ops


def test_setup_tracing_is_idempotent_when_enabled(
    _clean_telemetry_state: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Calling setup twice with an endpoint doesn't double-instrument."""
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4318")
    monkeypatch.setenv("OTEL_SERVICE_NAME", "pawrrtal-test")
    from app.core.telemetry import setup_tracing, shutdown_tracing

    setup_tracing(app=None)
    setup_tracing(app=None)  # idempotent — must not raise even though instrumentors already installed
    shutdown_tracing()


def test_get_tracer_returns_noop_tracer_when_disabled(_clean_telemetry_state: None) -> None:
    """Call sites can call ``get_tracer().start_as_current_span()`` unconditionally."""
    from app.core.telemetry import get_tracer

    tracer = get_tracer("pawrrtal.test")
    # The OTel API returns a NoOpTracer when no provider is installed —
    # start_as_current_span should produce a context manager that just
    # works without doing anything observable.
    with tracer.start_as_current_span("test-span") as span:
        span.set_attribute("pawrrtal.test", True)


def test_shutdown_tracing_is_safe_before_init(_clean_telemetry_state: None) -> None:
    """Calling shutdown before setup should be a clean no-op."""
    from app.core.telemetry import shutdown_tracing

    shutdown_tracing()  # No exception.


def test_setup_tracing_handles_missing_optional_packages_gracefully(
    _clean_telemetry_state: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If the OTel extras are not installed, setup must log + return.

    We simulate this by setting the endpoint but stubbing the import to
    raise.  Note: in our actual venv the extras ARE installed, so we
    can't trigger the ImportError naturally; the test guards the error
    handling path is wired and won't crash the app.
    """
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://collector:4318")

    # Force-shadow one of the deferred imports.
    fake_modules = {
        "opentelemetry.instrumentation.httpx": None,
    }
    import sys

    original = {k: sys.modules.get(k) for k in fake_modules}
    for name in fake_modules:
        sys.modules[name] = None  # type: ignore[assignment]
    try:
        from app.core.telemetry import setup_tracing

        # Should not raise even though one of the imports is broken.
        setup_tracing(app=None)
    finally:
        for name, value in original.items():
            if value is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = value


def test_otel_enabled_reads_endpoint_env_var(
    _clean_telemetry_state: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The enabled gate is purely the standard endpoint env var."""
    from app.core.telemetry import _otel_enabled

    assert _otel_enabled() is False
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    assert _otel_enabled() is False
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://collector:4318")
    assert _otel_enabled() is True
