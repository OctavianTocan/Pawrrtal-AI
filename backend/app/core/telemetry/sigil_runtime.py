"""Grafana Sigil client lifecycle and OpenTelemetry OTLP bootstrap.

The Sigil SDK does not install global TracerProvider / MeterProvider instances.
When ``OTEL_EXPORTER_OTLP_ENDPOINT`` is set, this module registers OTLP/HTTP
exporters **before** constructing :class:`sigil_sdk.Client` so SDK spans and
metrics are not dropped on no-op providers.

See package docstring in :mod:`app.core.telemetry` for environment variables.
"""

from __future__ import annotations

import logging
import os

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from sigil_sdk import Client, ClientConfig, GenerationExportConfig

_logger = logging.getLogger(__name__)

_sigil_client: Client | None = None
_otel_tracer_provider: TracerProvider | None = None
_otel_meter_provider: MeterProvider | None = None


def get_sigil_client() -> Client | None:
    """Return the process-wide Sigil client, or ``None`` when disabled."""
    return _sigil_client


def init_sigil_runtime() -> None:
    """Configure OTLP (if env indicates) and construct the Sigil :class:`Client`.

    OpenTelemetry providers must be registered **before** ``Client()`` so SDK
    spans and histograms are exported. Shutdown order is the reverse in
    :func:`shutdown_sigil_runtime`.
    """
    global _sigil_client  # noqa: PLW0603

    if os.getenv("SIGIL_DISABLED", "").strip().lower() in ("1", "true", "yes", "on"):
        _logger.info("Sigil disabled via SIGIL_DISABLED.")
        _sigil_client = None
        _configure_otel_if_needed()
        return

    _configure_otel_if_needed()

    token = os.getenv("SIGIL_AUTH_TOKEN", "").strip()
    instr_only = os.getenv("SIGIL_INSTRUMENTATION_ONLY", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )

    if not token and not instr_only:
        _sigil_client = None
        _logger.debug(
            "Sigil client not started (set SIGIL_AUTH_TOKEN or SIGIL_INSTRUMENTATION_ONLY).",
        )
        return

    if instr_only and not token:
        _sigil_client = Client(
            ClientConfig(generation_export=GenerationExportConfig(protocol="none")),
        )
        _logger.info("Sigil client started (instrumentation-only, no generation export).")
        return

    _sigil_client = Client()
    _logger.info("Sigil client initialized (generation export from SIGIL_* env).")


def shutdown_sigil_runtime() -> None:
    """Flush Sigil export queues, shut down the client, then OTel providers."""
    global _sigil_client, _otel_tracer_provider, _otel_meter_provider  # noqa: PLW0603

    client = _sigil_client
    _sigil_client = None
    if client is not None:
        try:
            client.shutdown()
        except Exception as exc:
            _logger.warning("Sigil client shutdown failed: %s", exc, exc_info=True)

    if _otel_meter_provider is not None:
        try:
            _otel_meter_provider.shutdown()
        except Exception as exc:
            _logger.warning("MeterProvider shutdown failed: %s", exc, exc_info=True)
        _otel_meter_provider = None

    if _otel_tracer_provider is not None:
        try:
            _otel_tracer_provider.shutdown()
        except Exception as exc:
            _logger.warning("TracerProvider shutdown failed: %s", exc, exc_info=True)
        _otel_tracer_provider = None


def _configure_otel_if_needed() -> None:
    """Install global TracerProvider and MeterProvider when OTLP endpoint is set."""
    global _otel_tracer_provider, _otel_meter_provider  # noqa: PLW0603

    if _otel_tracer_provider is not None:
        return

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    if not endpoint:
        _logger.debug(
            "OTEL_EXPORTER_OTLP_ENDPOINT unset; Sigil SDK uses default no-op trace/metrics.",
        )
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", "pawrrtal-api").strip() or "pawrrtal-api"
    resource = Resource.create({"service.name": service_name})

    _otel_tracer_provider = TracerProvider(resource=resource)
    _otel_tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(_otel_tracer_provider)

    metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
    _otel_meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(_otel_meter_provider)

    _logger.info(
        "OpenTelemetry OTLP exporters configured (endpoint=%s, service=%s).",
        endpoint,
        service_name,
    )
