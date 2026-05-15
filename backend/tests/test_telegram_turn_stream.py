"""Tests for `app.integrations.telegram.turn_stream`.

First-pass coverage. The public `stream_persisted_turn` does a lot of
side-effects (DB write, channel delivery, provider stream, aggregator
finalisation) — testing it end-to-end needs deep mocking of aiogram's
Message, the channel sender, the provider, and the async session maker.
This file starts with the channel-message construction helper, which is
self-contained and exercises the surface that the integration test would
otherwise have to set up by hand.

The broader coverage push for `turn_stream` + `bot` + `handlers` is
tracked separately so this file can land without ballooning.
"""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from typing import TYPE_CHECKING

import pytest

from app.channels.telegram import SURFACE_TELEGRAM
from app.integrations.telegram.handlers import TelegramTurnContext
from app.integrations.telegram.turn_stream import _build_channel_message

if TYPE_CHECKING:
    pass


def _make_message(*, chat_id: int = 42, bot: object | None = None) -> object:
    """Construct a minimal stand-in for `aiogram.types.Message`.

    Only the attributes `_build_channel_message` reads (`bot`, `chat.id`)
    need to be present; aiogram's real `Message` carries dozens more
    fields, none of which the function under test touches.
    """
    return SimpleNamespace(bot=bot, chat=SimpleNamespace(id=chat_id))


def _make_context(*, model_id: str = "google-ai:google/gemini-3-flash-preview") -> TelegramTurnContext:
    """Construct a `TelegramTurnContext` with deterministic UUIDs."""
    return TelegramTurnContext(
        nexus_user_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        conversation_id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        model_id=model_id,
    )


class TestBuildChannelMessage:
    """`_build_channel_message` projects (Message, TelegramTurnContext) into a
    `ChannelMessage` dict that the Telegram channel delivery code consumes.
    """

    def test_returns_channel_message_with_user_and_conversation_ids(self) -> None:
        """User and conversation IDs come from the turn context, not the Telegram message."""
        context = _make_context()
        message = _make_message()

        result = _build_channel_message(
            message=message,  # type: ignore[arg-type]  # SimpleNamespace stand-in
            context=context,
            user_text="hello",
            placeholder_message_id=99,
        )

        assert result["user_id"] == context.nexus_user_id
        assert result["conversation_id"] == context.conversation_id

    def test_includes_user_text_and_telegram_surface(self) -> None:
        """The verbatim user message + canonical surface string land in the
        result so the channel can echo them to the delivery code."""
        context = _make_context()
        message = _make_message()

        result = _build_channel_message(
            message=message,  # type: ignore[arg-type]
            context=context,
            user_text="please summarise",
            placeholder_message_id=7,
        )

        assert result["text"] == "please summarise"
        assert result["surface"] == SURFACE_TELEGRAM

    def test_propagates_model_id_from_context(self) -> None:
        """The model id from the turn context is propagated unchanged so
        downstream routing can use the user's chosen model."""
        context = _make_context(model_id="anthropic:anthropic/claude-sonnet-4-6")
        message = _make_message()

        result = _build_channel_message(
            message=message,  # type: ignore[arg-type]
            context=context,
            user_text="hi",
            placeholder_message_id=1,
        )

        assert result["model_id"] == "anthropic:anthropic/claude-sonnet-4-6"

    def test_metadata_carries_bot_chat_and_placeholder_ids(self) -> None:
        """The Telegram channel needs the bot handle, chat id, and the id of
        the placeholder message it should edit during streaming. All three
        live under `metadata`."""
        bot = SimpleNamespace(token="not-a-real-token")
        context = _make_context()
        message = _make_message(chat_id=12345, bot=bot)

        result = _build_channel_message(
            message=message,  # type: ignore[arg-type]
            context=context,
            user_text="x",
            placeholder_message_id=777,
        )

        metadata = result["metadata"]
        assert metadata["bot"] is bot
        assert metadata["chat_id"] == 12345
        assert metadata["message_id"] == 777

    @pytest.mark.parametrize("placeholder_id", [0, 1, 999_999_999])
    def test_accepts_a_range_of_placeholder_ids(self, placeholder_id: int) -> None:
        """Telegram message ids are int64s. The helper doesn't (and shouldn't)
        narrow that range."""
        context = _make_context()
        message = _make_message()

        result = _build_channel_message(
            message=message,  # type: ignore[arg-type]
            context=context,
            user_text="",
            placeholder_message_id=placeholder_id,
        )

        assert result["metadata"]["message_id"] == placeholder_id
