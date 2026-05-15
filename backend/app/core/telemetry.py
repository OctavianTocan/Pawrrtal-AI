"""OpenTelemetry tracing bootstrap for the Pawrrtal backend.

Adds distributed tracing across the HTTP request → SQLAlchemy →
outbound httpx layers without coupling to any specific vendor.  When
``OTEL_EXPORTER_OTLP_ENDPOINT`` is unset the entire system is a no-op,
so dev environments don't pay any cost.

What gets traced
----------------
- **FastAPI requests** — one span per HTTP request with the route
  template, status code, request method, and the ``request_id`` we
  already log under ``rid``.
- **SQLAlchemy queries** — every statement gets a span so a slow
  endpoint's query plan is visible.
- **httpx calls** — outbound calls (Claude / Gemini / Codex /
  Telegram / OAuth providers) get a span each, so we can see exactly
  which upstream is slow.
- **Anywhere we explicitly call ``tracer.start_as_current_span``** —
  the chat endpoint, agent loop, tool execution, etc., as we
  instrument them.

Vendor compatibility
--------------------
The OTLP/HTTP exporter we use is the standard one, so any OTel
backend works:

- Grafana Cloud (free tier; what PR #155 / Sigil is built around)
- Honeycomb
- Datadog
- New Relic
- Self-hosted Jaeger / Tempo / SigNoz

Just set ``OTEL_EXPORTER_OTLP_ENDPOINT`` + ``OTEL_EXPORTER_OTLP_HEADERS``
per the backend's docs.  The optional ``OTEL_SERVICE_NAME`` defaults
to ``pawrrtal-backend``.

Coexistence with PR #155 (Grafana Sigil)
----------------------------------------
PR #155 adds Sigil-specific provider spans (Gemini stream chunks,
Claude SDK iterations) using its own runtime initialiser.  This module
is the **underlying HTTP / DB / outbound** trace backbone.  Both can
run together: this module owns the global TracerProvider; Sigil
publishes additional spans into the same provider.  If both are
imported the first one to call ``setup_tracing`` wins (idempotent
guard), so the explicit lifespan order in ``main.py`` is what matters.
"""

from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

logger = logging.getLogger(__name__)

# Module-level flag so a duplicate lifespan boot is a clean no-op.
_initialised = False
_tracer_provider = None  # type: ignore[assignment]


if TYPE_CHECKING:
    from fastapi import FastAPI


def _otel_enabled() -> bool:
    """OTel is on when an OTLP endpoint is configured.

    Standard OTel env var; matches the convention every collector
    expects.  Empty / unset → no-op.
    """
    return bool(os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"))


def _workshop_url() -> str:
    """Return the Raindrop Workshop OTLP base URL, or empty string when unset.

    Workshop runs on port 5899 by default.  Reads ``RAINDROP_WORKSHOP_URL``
    so local dev can point at Workshop without touching the production
    ``OTEL_EXPORTER_OTLP_ENDPOINT``.
    """
    return os.environ.get("RAINDROP_WORKSHOP_URL", "").rstrip("/")


def setup_tracing(app: FastAPI | None = None) -> None:
    """Install the OTel TracerProvider + autoinstrumenters.

    Idempotent — safe to call multiple times.  When OTel is disabled
    (no endpoint env var) this returns immediately so production
    startup is unaffected.

    Args:
        app: FastAPI application instance to autoinstrument.  May be
            ``None`` when only SQLAlchemy + httpx instrumentation is
            needed (e.g. cron jobs).
    """
    global _initialised, _tracer_provider  # noqa: PLW0603 — idempotency singleton

    if _initialised:
        return
    workshop_url = _workshop_url()
    if not _otel_enabled() and not workshop_url:
        logger.info("TELEMETRY_DISABLED reason=no_otel_endpoint")
        _initialised = True
        return

    # Imports are deferred so an install without the OTel extras still
    # boots when telemetry is disabled.  If the user sets the endpoint
    # but didn't install the extras we want a loud failure here, not
    # a silent one.
    try:
        from opentelemetry import trace  # noqa: PLC0415
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (  # noqa: PLC0415
            OTLPSpanExporter,
        )
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor  # noqa: PLC0415
        from opentelemetry.instrumentation.logging import LoggingInstrumentor  # noqa: PLC0415
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor  # noqa: PLC0415
        from opentelemetry.sdk.resources import Resource  # noqa: PLC0415
        from opentelemetry.sdk.trace import TracerProvider  # noqa: PLC0415
        from opentelemetry.sdk.trace.export import BatchSpanProcessor  # noqa: PLC0415
    except ImportError:
        logger.exception(
            "TELEMETRY_INSTALL_MISSING — set OTEL_EXPORTER_OTLP_ENDPOINT only "
            "after installing the OTel extras (`uv pip install -e .[otel]` or "
            "add the opentelemetry-* packages to your image).",
        )
        return

    service_name = os.environ.get("OTEL_SERVICE_NAME", "pawrrtal-backend")
    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": "pawrrtal",
            "deployment.environment": os.environ.get("ENV", "dev"),
        }
    )

    provider = TracerProvider(resource=resource)

    if _otel_enabled():
        # OTLP/HTTP picks the endpoint + headers up from standard env vars
        # (OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_HEADERS,
        # OTEL_EXPORTER_OTLP_PROTOCOL).  We don't pass them explicitly so
        # operators can configure with the convention every collector
        # expects, including custom protocols + headers.
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))

    if workshop_url:
        # Mirror every span to the local Raindrop Workshop debugger.
        # Workshop accepts standard OTLP/HTTP at /v1/traces, so no auth
        # header is needed — it only binds to localhost.
        workshop_traces_endpoint = f"{workshop_url}/v1/traces"
        provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=workshop_traces_endpoint))
        )
        logger.info("TELEMETRY_WORKSHOP_MIRROR endpoint=%s", workshop_traces_endpoint)

    trace.set_tracer_provider(provider)

    # Auto-instrument the three layers worth one-line wins:
    if app is not None:
        # FastAPI instrumentor must be imported lazily to avoid pulling
        # starlette internals before the app is constructed.
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor  # noqa: PLC0415

        FastAPIInstrumentor.instrument_app(
            app,
            # Drop health probes — they fire every few seconds and
            # would dominate trace volume.  Drop OPTIONS preflights
            # for CORS for the same reason.
            excluded_urls="^(.*/health(/ready)?|.*/favicon\\.ico)$",
        )

    HTTPXClientInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    # Inject trace + span IDs into every log record so log lines can
    # be joined to traces in the backend without manual correlation.
    LoggingInstrumentor().instrument(set_logging_format=False)

    _tracer_provider = provider
    _initialised = True
    primary_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "<none>")
    logger.info(
        "TELEMETRY_ENABLED service=%s endpoint=%s workshop=%s",
        service_name,
        primary_endpoint,
        workshop_url or "<none>",
    )


def shutdown_tracing() -> None:
    """Flush + shut down the tracer provider during app shutdown.

    No-op when tracing was never initialised.  Forces a final flush of
    the BatchSpanProcessor so spans buffered at the moment uvicorn
    receives SIGTERM still make it to the collector.
    """
    global _initialised, _tracer_provider  # noqa: PLW0603 — idempotency singleton
    if _tracer_provider is None:
        return
    try:
        _tracer_provider.shutdown()
    except Exception:
        logger.warning("TELEMETRY_SHUTDOWN_FAILED", exc_info=True)
    finally:
        _tracer_provider = None
        _initialised = False


def get_tracer(name: str | None = None):
    """Return an OTel ``Tracer`` for the given name.

    Convenience so call sites don't all import ``opentelemetry.trace``
    directly.  Works even when tracing is disabled — returns a no-op
    tracer that swallows ``start_as_current_span`` calls without
    overhead.
    """
    from opentelemetry import trace  # noqa: PLC0415

    return trace.get_tracer(name or "pawrrtal")
