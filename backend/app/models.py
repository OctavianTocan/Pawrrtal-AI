"""SQLAlchemy ORM models for the application database.

Note: The ``User`` model lives in ``db.py`` because fastapi-users needs it
at import time. All other domain models are defined here.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Text

from .db import Base


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
    # TODO(pawrrtal-j8o1): re-add three Mapped[...] columns here. The DB
    #   already has them (migration 011); only the ORM declarations are
    #   missing. One is a label, one is a topic ID, one is a fire-once
    #   lifecycle marker the auto-title helper reads.


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


# TODO(pawrrtal-j8o1): two ORM classes go here. Tables already exist in
#   the DB (migrations 007 + 011) — match those column types exactly.
#   One has a unique constraint that prevents the same external identity
#   from mapping to two Pawrrtal users; the other uses a hashed column as
#   its primary key.


class ChannelLinkCode(Base):
    """A short-lived one-time-use code for linking a Pawrrtal user to a third-party channel."""

    __tablename__ = "channel_link_codes"

    # This is the HMAC-SHA-256 hex-encoded hash of the code. It's what the user sees and pastes into the channel.
    code_hash: Mapped[str] = mapped_column(String(128), primary_key=True)
    # The Pawrrtal user ID.
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # The third-party provider.
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    # Created at timestamp.
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # Expires at timestamp.
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # Has this been used to create a binding?
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ChannelBinding(Base):
    """A binding between a Pawrrtal user and a third-party channel."""

    __tablename__ = "channel_bindings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)

    # The Pawrrtal user ID.
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # The third-party channel ID.
    external_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    # The third-party provider.
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    # Created at timestamp.
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


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
    """An agent workspace.

    A named directory on the host filesystem containing the standard
    OpenClaw-style file structure (AGENTS.md, SOUL.md, USER.md,
    IDENTITY.md, memory/, skills/, artifacts/).

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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
