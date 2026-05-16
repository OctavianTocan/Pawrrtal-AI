"""Inbound webhook receiver — bridges external providers into the event bus.

GitHub-style HMAC-SHA256 signature + a generic Bearer-token auth for
everything else.  Every accepted delivery writes a ``webhook_events``
row first (atomic INSERT … ON CONFLICT DO NOTHING for dedupe) and
then publishes a ``WebhookEvent`` to the bus.

The router is intentionally thin — the AgentHandler that subscribes
to ``WebhookEvent`` is what actually runs the agent turn (PR 11
ships the receiver; the AgentHandler ships in PR 11b alongside the
notification path).
"""

from app.api.integrations.webhooks.auth import (
    verify_github_signature,
    verify_shared_secret,
)
from app.api.integrations.webhooks.receiver import get_webhooks_router

__all__ = [
    "get_webhooks_router",
    "verify_github_signature",
    "verify_shared_secret",
]
