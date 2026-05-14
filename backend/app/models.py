"""SQLAlchemy ORM models for the application database.

Note: The ``User`` model lives in ``db.py`` because fastapi-users needs it
at import time. All other domain models are defined here.
"""

import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from .db import Base


def _utcnow() -> datetime:
    """Timezone-aware UTC now.

    ``datetime.utcnow()`` is deprecated in Python 3.13 (returns a naive
    datetime that lies about its timezone). Centralised so every model
    default uses the same callable rather than re-importing UTC at the
    column site.
    """
    return datetime.now(UTC)


class SenderType(Enum):
    """Identifies who sent a message in a conversation."""

    AI = "ai"
    USER = "user"


class Conversation(Base):
    """Conversation metadata stored in the application database.

    Actual message content is persisted by the Agno library in its own database. The two are linked via ``Conversation.id`` ==
    Agno's ``session_id``.
    """

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_unread: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    status: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # "todo"|"in_progress"|"done"|null
    model_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # JSON array of label IDs (e.g. ["bug", "feature"]). Validated against
    # the frontend pre-defined CHAT_LABELS list — the backend stores raw
    # IDs without enforcement so adding a new label client-side does not
    # require a migration. Defaults to an empty list rather than NULL so
    # `Conversation.labels.append(...)` always works without a None guard.
    labels: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    # Optional FK to the project this conversation belongs to. NULL means
    # the conversation lives in the unattached "Chats" list at the bottom
    # of the sidebar; setting it surfaces the row under the project's
    # nested children. ON DELETE SET NULL so removing a project keeps the
    # conversations around and just unattaches them.
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    # Channel that created this conversation (e.g. "telegram", "web").
    origin_channel: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Telegram Bot API 9.3+ topic thread ID.  NULL for non-topic DMs.
    telegram_thread_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Lifecycle marker for the auto-title feature:
    # NULL = not yet titled, "auto" = generated, "user" = user-edited.
    title_set_by: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # Per-conversation verbose level for streaming UX (PR 07):
    # 0 = quiet (only deltas + errors), 1 = normal (+ tool_use names),
    # 2 = detailed (+ thinking + tool inputs). NULL inherits
    # settings.telegram_verbose_default (or 1 if unset).
    verbose_level: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Project(Base):
    """Top-level project users can drop conversations into.

    Pure organizational container — has no settings of its own today.
    Conversations point at it via ``Conversation.project_id``; deleting
    the project sets every linked conversation's ``project_id`` back to
    NULL rather than cascading.
    """

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class UserPreferences(Base):
    """User preferences stored in the application database."""

    __tablename__ = "user_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    font_size: Mapped[int] = mapped_column()


class UserPersonalization(Base):
    """Personalization profile filled in by the home-page wizard.

    1:1 with `user`. Every field is nullable so a partial profile (e.g.
    user skipped the ChatGPT-context step) round-trips cleanly through
    GET / PUT without coercing missing fields into empty strings.
    """

    __tablename__ = "user_personalization"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_website: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    linkedin: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    goals: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    connected_channels: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    chatgpt_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    personality: Mapped[str | None] = mapped_column(String(64), nullable=True)
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class UserAppearance(Base):
    """Per-user theme overrides for the Settings → Appearance panel.

    1:1 with `user`. All fields are JSON blobs so the schema can grow
    (new color slots, new font slots, new behavioral toggles) without a
    migration per addition. Missing keys at the application layer fall
    back to the Mistral-inspired defaults baked into
    ``frontend/app/globals.css`` and mirrored in
    ``frontend/features/appearance/defaults.ts``. A fully empty row
    means "use the system defaults everywhere."

    Light and dark mode are tracked separately because dark mode is
    Codex/GitHub-adjacent in the Pawrrtal design system, not just
    inverted from light.
    """

    __tablename__ = "user_appearance"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    # Per-mode color overrides: { background, foreground, accent, info,
    # success, destructive }. Each value is a CSS color string (hex,
    # `oklch(...)`, etc.) that replaces the corresponding `--<role>` CSS
    # variable on `<html>` for that theme.
    light: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    dark: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # Font family overrides: { display, sans, mono }. Each is a raw CSS
    # font-family value (e.g. "Newsreader, Georgia, serif").
    fonts: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # Mode + global tweaks. See the Pydantic `AppearanceOptions` schema
    # for the canonical shape.
    options: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ChannelBinding(Base):
    """Persistent map from a third-party messaging identity to a Nexus user.

    One row per (provider, external_user_id) — enforced by a unique
    constraint so a Telegram account can never silently move between
    Nexus users. Created when a user successfully redeems a one-time
    code via the bot's `/start <code>` (or manual paste) flow.

    The `provider` column is open-ended on purpose: today only
    `"telegram"` is wired up, but the same table will host Slack,
    WhatsApp, iMessage, etc. as those adapters land.
    """

    __tablename__ = "channel_bindings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(32))
    # Provider identities can be ints (Telegram user_id) or strings
    # (Slack user IDs, WhatsApp phone numbers). Normalize to text so
    # the column shape stays the same across providers.
    external_user_id: Mapped[str] = mapped_column(String(128))
    # Default chat to push to. For Telegram direct chats this matches
    # external_user_id; for groups it's the chat where the bind happened.
    external_chat_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Display handle captured at bind time. Stored for admin/debug only,
    # never used for authentication.
    display_handle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # The conversation that is currently active for non-topic DMs.
    # NULL until the first message arrives.  ON DELETE SET NULL so
    # removing the conversation doesn't orphan the binding.
    active_conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    # True when this Telegram chat has Bot API 9.3+ Topics enabled.
    # Drives the routing branch in the inbound message handler.
    has_topics_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)


class ChannelLinkCode(Base):
    """Short-lived one-time-use code that brokers a channel bind.

    The web app issues a code (server-side; user only sees the plaintext
    once), the user sends it to the bot, and the bot consumes the row to
    create the matching `ChannelBinding`. We persist an HMAC of the code
    rather than the plaintext so a DB leak cannot be replayed against
    the bot. Lookups are always by `code_hash`, which is therefore the
    primary key.
    """

    __tablename__ = "channel_link_codes"

    code_hash: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    # NULL while the code is unredeemed; populated once the bot consumes it.
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ChatMessage(Base):
    """A single chat message within a conversation, including reasoning state.

    This is the source of truth for what the chat UI renders on a refresh:
    role, plain-text content, thinking/reasoning text, tool invocations and
    their results, the arrival-ordered timeline, and the reasoning duration.
    Provider-agnostic — both Agno-backed and Claude-backed turns write here.

    Note: Agno also keeps its own message log for context-window plumbing on
    the next turn. That log is not used for rendering history; this table is.
    """

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user.id", ondelete="CASCADE"))
    # Stable insertion order within a conversation. Only ever increases —
    # regenerate replaces the row in place rather than allocating a new ordinal.
    ordinal: Mapped[int] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String(20))  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, default="")
    thinking: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON arrays — None when absent so the column shrinks to NULL on reads.
    tool_calls: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    timeline: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    thinking_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # "streaming" | "complete" | "failed" — only meaningful on assistant rows.
    assistant_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Workspace-relative path to a file the agent delivered via send_message.
    attachment: Mapped[str | None] = mapped_column(String(4096), nullable=True)
    # MIME type detected from the attachment path (e.g. "image/png").
    attachment_mime: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class Workspace(Base):
    """An agent workspace — a named directory on the host filesystem.

    Contains the standard OpenClaw-style file structure: AGENTS.md, SOUL.md,
    USER.md, IDENTITY.md, memory/, skills/, artifacts/.

    One user can own many workspaces.  The first workspace created for a user
    is flagged ``is_default=True`` and seeded automatically at the end of the
    onboarding flow using the user's ``UserPersonalization`` data.

    The ``path`` column is the absolute path on the host.  Agents that need
    filesystem access resolve the path from here rather than constructing it
    ad-hoc from the user ID.
    """

    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Human-readable label shown in the UI (e.g. "Main", "Work", "Personal").
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Main")
    # Filesystem-safe slug used only as a readable hint alongside the UUID path.
    slug: Mapped[str] = mapped_column(String(255), nullable=False, default="main")
    # Absolute path to the workspace root directory on the host.
    path: Mapped[str] = mapped_column(String(4096), nullable=False)
    # Exactly one workspace per user should be the default at any given time.
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


# ---------------------------------------------------------------------------
# Governance + ops platform (PRs 01-12)
#
# Four tables that back the cross-cutting policy + automation surface:
#
#   audit_events       — typed, append-only security/operational log with
#                        risk levels (`auth_attempt`, `tool_call`,
#                        `security_violation`, `cost_limit_exceeded`, …).
#   cost_ledger        — one row per LLM turn, source of truth for spend
#                        rollups (`GET /api/v1/cost`, budget gate).
#   scheduled_jobs     — durable cron job definitions; APScheduler hydrates
#                        these on boot and re-registers triggers.
#   webhook_events     — inbound webhook deliveries; the `delivery_id`
#                        unique index powers atomic
#                        `INSERT … ON CONFLICT DO NOTHING` dedupe.
#
# Each follows the existing conventions (Uuid PK, FK to user with CASCADE,
# JSON for flexible payloads, `created_at` on every row).
# ---------------------------------------------------------------------------


# Maximum length of an audit event type string. 64 covers every documented
# type with room for future extension without a column-resize migration.
_AUDIT_EVENT_TYPE_LEN = 64
# Length cap for risk-level strings (`low`/`medium`/`high`/`critical`).
_AUDIT_RISK_LEVEL_LEN = 16
# Provider identifier length: comfortably fits `claude-agent-sdk` and
# common provider slugs without forcing future migrations.
_COST_PROVIDER_LEN = 64
# Model-id length matches the existing column on `conversations`.
_MODEL_ID_LEN = 100
# Scheduled-job name length: human-readable label, not a slug.
_SCHEDULED_JOB_NAME_LEN = 128
# Cron expression length (5-field cron tops out around 100 chars in
# practice — APScheduler also accepts seconds-precision 6-field).
_CRON_EXPRESSION_LEN = 128
# Status length for scheduled_jobs (`pending`/`running`/`completed`/`failed`).
_SCHEDULED_JOB_STATUS_LEN = 16
# Skill identifier length on scheduled jobs (optional, e.g. `triage`).
_SKILL_NAME_LEN = 64
# Webhook provider slug length (`github`, `linear`, `stripe`, …).
_WEBHOOK_PROVIDER_LEN = 32
# Webhook event-type length (e.g. `push`, `pull_request.opened`).
_WEBHOOK_EVENT_TYPE_LEN = 64
# Delivery-id length sized for GitHub's UUID-ish delivery headers.
_WEBHOOK_DELIVERY_ID_LEN = 128


class AuditEvent(Base):
    """Append-only audit log for security and operational events.

    Ported in shape from claude-code-telegram's ``src/security/audit.py``,
    backed by SQLAlchemy + Postgres instead of in-memory. Every row is
    immutable; the application never updates or deletes rows except via
    the retention purge job (which deletes whole rows older than the
    configured TTL — never edits them).

    The ``event_type`` set is open (no enum) so new types can be added
    without a migration; the canonical vocabulary is documented in
    ``backend/app/core/governance/audit.py`` (PR 02).

    ``risk_level`` is one of ``low|medium|high|critical`` and is computed
    by the audit logger from the event_type + details payload. It is
    persisted so the dashboard query can aggregate without re-deriving.
    """

    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # NULL when the event isn't user-attributable (e.g. webhook delivery
    # with an unknown signature). Most events have a user.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(String(_AUDIT_EVENT_TYPE_LEN), index=True)
    # True for `auth_attempt: success=True` etc. Always False for
    # `security_violation` (CCT convention).
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    risk_level: Mapped[str] = mapped_column(
        String(_AUDIT_RISK_LEVEL_LEN), nullable=False, default="low"
    )
    # Arbitrary structured payload. Tool inputs persisted here are
    # always pre-redacted by ``governance.secret_redaction`` (PR 02).
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # Surface that originated the event (`web`, `telegram`, `webhook`, …).
    surface: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Request ID from ``request_logging.get_request_id()`` so audit rows
    # correlate with log lines and OTel spans.
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class CostLedger(Base):
    """One row per LLM turn, source of truth for spend rollups.

    The chat router writes a row per turn after the provider emits its
    ``usage`` event (PR 04). Aggregations for the cost gate
    (``GET /api/v1/cost`` and the ``CostBudgetMiddleware``) run as
    indexed SQL over this table.

    ``cost_usd`` is the authoritative value — for Claude it comes from
    ``ResultMessage.total_cost_usd``; for Gemini it's computed by
    multiplying token counts against the per-mtok rates registered on
    the catalog (``ModelEntry.cost_per_mtok_*_usd``).
    """

    __tablename__ = "cost_ledger"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(_COST_PROVIDER_LEN))
    model_id: Mapped[str] = mapped_column(String(_MODEL_ID_LEN))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    # Stored as Float for simplicity. The values are dollar-cents-scale
    # so float rounding is well below a cent.
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    # Surface lets us partition spend by web vs telegram vs webhook in
    # reporting without a JOIN.
    surface: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class ScheduledJob(Base):
    """Durable cron job definition; APScheduler re-registers on boot.

    The scheduler (PR 12) reads every active row on startup and
    re-installs the corresponding cron trigger. New jobs go through
    ``POST /api/v1/scheduled-jobs`` which writes here AND adds to the
    live scheduler in one transaction.

    Soft-delete via ``is_active`` so historical jobs can be inspected
    for audit / debugging (the scheduler skips ``is_active=False``).
    """

    __tablename__ = "scheduled_jobs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(_SCHEDULED_JOB_NAME_LEN))
    cron_expression: Mapped[str] = mapped_column(String(_CRON_EXPRESSION_LEN))
    # Prompt the agent runs when the job fires.
    prompt: Mapped[str] = mapped_column(Text)
    # Optional skill to invoke (`/triage`, etc.) — prepended to the prompt.
    skill_name: Mapped[str | None] = mapped_column(String(_SKILL_NAME_LEN), nullable=True)
    # Telegram chat IDs the result is delivered to, persisted as a JSON
    # array of strings (chat IDs can exceed 32-bit signed range).
    target_chat_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    # Optional working-directory hint — defaults to the user's workspace.
    working_directory: Mapped[str | None] = mapped_column(String(4096), nullable=True)
    # Lifecycle: `pending` → `running` → `completed`|`failed`. NULL until
    # the first fire.
    last_status: Mapped[str | None] = mapped_column(
        String(_SCHEDULED_JOB_STATUS_LEN), nullable=True
    )
    last_fired_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class WebhookEventRecord(Base):
    """Inbound webhook delivery, persisted for atomic dedupe + audit.

    The receiver (PR 11) inserts a row with ``INSERT … ON CONFLICT
    DO NOTHING`` on ``delivery_id``. If 1 row was inserted, the event
    is new and gets published to the bus; if 0, it's a duplicate and
    the receiver returns ``{"status": "duplicate"}`` without re-firing
    the agent.

    ``user_id`` is NULL when the webhook isn't user-attributable; for
    GitHub events we can usually map the repo owner to a user via a
    future workspace-link table (PR not in this stack).
    """

    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), nullable=True, index=True
    )
    provider: Mapped[str] = mapped_column(String(_WEBHOOK_PROVIDER_LEN), index=True)
    event_type: Mapped[str] = mapped_column(String(_WEBHOOK_EVENT_TYPE_LEN))
    # Provider-supplied delivery identifier (e.g. GitHub's
    # `X-GitHub-Delivery` header). Indexed UNIQUE for the dedupe insert.
    delivery_id: Mapped[str] = mapped_column(
        String(_WEBHOOK_DELIVERY_ID_LEN), unique=True, index=True
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    # Was the resulting `WebhookEvent` ever delivered to an agent? NULL
    # until the AgentHandler picks it up; populated when the response
    # is delivered.
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)
