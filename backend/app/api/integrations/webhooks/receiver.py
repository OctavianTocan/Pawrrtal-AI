"""FastAPI router exposing ``POST /webhooks/{provider}``.

* Verifies signature / shared secret (rejects with 401 on mismatch).
* Atomically dedupes via ``insert_or_dedupe_webhook_event`` — a
  duplicate ``delivery_id`` returns ``{"status": "duplicate"}``
  with HTTP 200 so the upstream provider doesn't keep retrying.
* On accept, publishes a :class:`WebhookEvent` to the global event
  bus.  The AgentHandler subscribes there (PR 11b) and runs an
  agent turn.

Configuration:
* ``settings.webhook_api_enabled`` — master switch
* ``settings.github_webhook_secret`` — HMAC secret for ``provider="github"``
* ``settings.webhook_api_secret`` — Bearer token for any other provider
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import JSONResponse

from app.api.integrations.webhooks.auth import (
    verify_github_signature,
    verify_shared_secret,
)
from app.core.config import settings
from app.core.db import get_async_session
from app.core.event_bus import WebhookEvent
from app.core.event_bus.global_bus import publish_if_available
from app.crud.webhook_events import insert_or_dedupe_webhook_event

logger = logging.getLogger(__name__)


def get_webhooks_router() -> APIRouter:
    """Build the ``/webhooks`` router."""
    router = APIRouter(prefix="/webhooks", tags=["webhooks"])

    @router.post("/{provider}")
    async def receive_webhook(
        provider: str,
        request: Request,
        x_hub_signature_256: str | None = Header(default=None),
        x_github_event: str | None = Header(default=None),
        x_github_delivery: str | None = Header(default=None),
        authorization: str | None = Header(default=None),
        session: AsyncSession = Depends(get_async_session),
    ) -> JSONResponse:
        """Verify, dedupe, publish."""
        if not settings.webhook_api_enabled:
            raise HTTPException(status_code=503, detail="Webhook receiver is disabled")

        body = await request.body()

        event_type_name, delivery_id = _verify_and_extract_metadata(
            provider=provider,
            body=body,
            x_hub_signature_256=x_hub_signature_256,
            x_github_event=x_github_event,
            x_github_delivery=x_github_delivery,
            authorization=authorization,
            request=request,
        )

        try:
            payload = await request.json()
        except (ValueError, TypeError):
            payload = {"_raw_body_truncated": body.decode("utf-8", errors="replace")[:5000]}

        row = await insert_or_dedupe_webhook_event(
            session=session,
            provider=provider,
            event_type_name=event_type_name,
            delivery_id=delivery_id,
            payload=payload,
        )
        if row is None:
            logger.info(
                "WEBHOOK_DUPLICATE provider=%s delivery_id=%s",
                provider,
                delivery_id,
            )
            return JSONResponse(
                status_code=200,
                content={"status": "duplicate", "delivery_id": delivery_id},
            )

        await publish_if_available(
            WebhookEvent(
                provider=provider,
                event_type_name=event_type_name,
                payload=payload,
                delivery_id=delivery_id,
            )
        )

        logger.info(
            "WEBHOOK_ACCEPTED provider=%s event_type=%s delivery_id=%s id=%s",
            provider,
            event_type_name,
            delivery_id,
            row.id,
        )
        return JSONResponse(
            status_code=202,
            content={
                "status": "accepted",
                "id": str(row.id),
                "delivery_id": delivery_id,
            },
        )

    return router


def _verify_and_extract_metadata(
    *,
    provider: str,
    body: bytes,
    x_hub_signature_256: str | None,
    x_github_event: str | None,
    x_github_delivery: str | None,
    authorization: str | None,
    request: Request,
) -> tuple[str, str]:
    """Return (event_type_name, delivery_id); raise HTTP 401 on bad auth."""
    if provider == "github":
        return _verify_github(
            body=body,
            x_hub_signature_256=x_hub_signature_256,
            x_github_event=x_github_event,
            x_github_delivery=x_github_delivery,
        )
    return _verify_generic(authorization=authorization, request=request)


def _verify_github(
    *,
    body: bytes,
    x_hub_signature_256: str | None,
    x_github_event: str | None,
    x_github_delivery: str | None,
) -> tuple[str, str]:
    """HMAC-SHA256 verification + GitHub-style metadata extraction."""
    if not settings.github_webhook_secret:
        raise HTTPException(
            status_code=503,
            detail="GitHub webhook secret not configured",
        )
    if not verify_github_signature(body, x_hub_signature_256, settings.github_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid signature")
    event_type_name = x_github_event or "unknown"
    delivery_id = x_github_delivery or str(uuid.uuid4())
    return event_type_name, delivery_id


def _verify_generic(
    *,
    authorization: str | None,
    request: Request,
) -> tuple[str, str]:
    """Bearer-token verification + ``X-Event-Type`` / ``X-Delivery-ID`` extraction."""
    if not settings.webhook_api_secret:
        raise HTTPException(
            status_code=503,
            detail=(
                "Generic webhook secret not configured.  "
                "Set WEBHOOK_API_SECRET to accept this provider."
            ),
        )
    if not verify_shared_secret(authorization, settings.webhook_api_secret):
        raise HTTPException(status_code=401, detail="Invalid authorization")
    event_type_name = request.headers.get("X-Event-Type", "unknown")
    delivery_id = request.headers.get("X-Delivery-ID", str(uuid.uuid4()))
    return event_type_name, delivery_id


__all__ = ["get_webhooks_router"]
