"""Tests for the TelegramChannel delivery layer.

Covers:
- ``TelegramChannel.surface`` — correct surface name
- ``TelegramChannel.deliver`` — debounced edit_message_text calls
- ``TelegramChannel.deliver`` — final edit always fired
- ``TelegramChannel.deliver`` — empty stream doesn't edit
- ``TelegramChannel.deliver`` — yields no bytes (side-effect only)
- ``resolve_channel("telegram")`` — registry entry
- ``handle_plain_message`` — unbound user returns string
- ``handle_plain_message`` — bound user returns TelegramTurnContext
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, patch

import pytest

from app.channels import resolve_channel
from app.channels.base import ChannelMessage
from app.channels.telegram import SURFACE_TELEGRAM, TelegramChannel
from app.core.providers.base import StreamEvent
from app.integrations.telegram.handlers import (
    TelegramSender,
    TelegramTurnContext,
    handle_model_command,
    handle_plain_message,
    handle_stop_command,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _stream(*events: StreamEvent) -> AsyncIterator[StreamEvent]:
    for event in events:
        yield event


def _make_channel_message(
    bot: AsyncMock, chat_id: int = 123, message_id: int = 456
) -> ChannelMessage:
    return ChannelMessage(
        user_id=uuid.uuid4(),
        conversation_id=uuid.uuid4(),
        text="hello",
        surface="telegram",
        model_id=None,
        metadata={
            "bot": bot,
            "chat_id": chat_id,
            "message_id": message_id,
        },
    )


def _make_bot() -> AsyncMock:
    bot = AsyncMock()
    bot.edit_message_text = AsyncMock()
    return bot


# ---------------------------------------------------------------------------
# TelegramChannel.surface
# ---------------------------------------------------------------------------


class TestTelegramChannelSurface:
    def test_surface_is_telegram(self) -> None:
        assert TelegramChannel.surface == SURFACE_TELEGRAM
        assert TelegramChannel().surface == "telegram"


# ---------------------------------------------------------------------------
# resolve_channel("telegram")
# ---------------------------------------------------------------------------


class TestTelegramRegistry:
    def test_resolve_returns_telegram_channel(self) -> None:
        ch = resolve_channel("telegram")
        assert isinstance(ch, TelegramChannel)

    def test_registered_surface_included(self) -> None:
        from app.channels import registered_surfaces

        assert "telegram" in registered_surfaces()


# ---------------------------------------------------------------------------
# TelegramChannel.deliver — streaming behaviour
# ---------------------------------------------------------------------------


@pytest.mark.anyio
class TestTelegramChannelDeliver:
    async def test_yields_no_bytes(self) -> None:
        """deliver() must not yield any bytes — it's side-effect only."""
        bot = _make_bot()
        msg = _make_channel_message(bot)
        channel = TelegramChannel()
        chunks = [
            chunk
            async for chunk in channel.deliver(
                _stream({"type": "delta", "content": "hello"}), msg
            )
        ]
        assert chunks == []

    async def test_empty_stream_no_edits(self) -> None:
        """No edits should be sent when the stream produces nothing."""
        bot = _make_bot()
        msg = _make_channel_message(bot)
        channel = TelegramChannel()
        async for _ in channel.deliver(_stream(), msg):
            pass
        bot.edit_message_text.assert_not_called()

    async def test_final_edit_always_sent(self) -> None:
        """Even a single small delta below the debounce threshold gets a final edit."""
        bot = _make_bot()
        msg = _make_channel_message(bot, chat_id=7, message_id=99)
        channel = TelegramChannel()

        async for _ in channel.deliver(
            _stream({"type": "delta", "content": "hi"}), msg
        ):
            pass

        bot.edit_message_text.assert_called_once_with(
            chat_id=7,
            message_id=99,
            text="hi",
        )

    async def test_accumulates_deltas(self) -> None:
        """Multiple deltas below the debounce threshold collapse into one final edit."""
        bot = _make_bot()
        msg = _make_channel_message(bot, chat_id=1, message_id=2)
        channel = TelegramChannel()

        events: list[StreamEvent] = [
            {"type": "delta", "content": "Hello"},
            {"type": "delta", "content": ", "},
            {"type": "delta", "content": "world"},
        ]
        async for _ in channel.deliver(_stream(*events), msg):
            pass

        # The final edit must contain the full accumulated text.
        calls = bot.edit_message_text.call_args_list
        last_call = calls[-1]
        assert last_call.kwargs["text"] == "Hello, world"

    async def test_non_delta_events_ignored(self) -> None:
        """Only ``type: delta`` events accumulate text; others are silently skipped."""
        bot = _make_bot()
        msg = _make_channel_message(bot)
        channel = TelegramChannel()

        events: list[StreamEvent] = [
            {"type": "thinking", "content": "reasoning..."},
            {"type": "delta", "content": "answer"},
            {"type": "tool_use", "name": "search", "input": {}},
        ]
        async for _ in channel.deliver(_stream(*events), msg):
            pass

        last_call = bot.edit_message_text.call_args_list[-1]
        assert last_call.kwargs["text"] == "answer"

    async def test_not_modified_error_swallowed(self) -> None:
        """TelegramBadRequest: message is not modified must not propagate."""
        bot = _make_bot()
        bot.edit_message_text.side_effect = Exception(
            "TelegramBadRequest: message is not modified"
        )
        msg = _make_channel_message(bot)
        channel = TelegramChannel()

        # Should not raise.
        async for _ in channel.deliver(_stream({"type": "delta", "content": "x"}), msg):
            pass

    async def test_other_errors_logged_not_raised(self) -> None:
        """Network or API errors should log a warning but not crash the turn."""
        bot = _make_bot()
        bot.edit_message_text.side_effect = Exception("network timeout")
        msg = _make_channel_message(bot)
        channel = TelegramChannel()

        async for _ in channel.deliver(_stream({"type": "delta", "content": "x"}), msg):
            pass  # Must not raise


# ---------------------------------------------------------------------------
# handle_plain_message
# ---------------------------------------------------------------------------


@pytest.mark.anyio
class TestHandlePlainMessage:
    async def test_unbound_user_returns_string(self) -> None:
        """An unknown external_user_id must return the not-bound nudge string."""
        sender = TelegramSender(
            user_id=999, chat_id=999, username=None, full_name="Stranger"
        )
        session = AsyncMock()
        with patch(
            "app.integrations.telegram.handlers.get_user_id_for_external",
            new=AsyncMock(return_value=None),
        ):
            result = await handle_plain_message(
                sender=sender, text="hello", session=session
            )
        assert isinstance(result, str)
        assert "don't recognize" in result.lower() or "connect" in result.lower()

    async def test_bound_user_returns_turn_context(self) -> None:
        """A known user must get a TelegramTurnContext with correct fields."""
        nexus_uid = uuid.uuid4()
        conv_id = uuid.uuid4()
        sender = TelegramSender(
            user_id=42, chat_id=42, username="tavi", full_name="Tavi"
        )
        session = AsyncMock()

        # Fake conversation row with no model override.
        fake_conv = AsyncMock()
        fake_conv.id = conv_id
        fake_conv.model_id = None

        with (
            patch(
                "app.integrations.telegram.handlers.get_user_id_for_external",
                new=AsyncMock(return_value=nexus_uid),
            ),
            patch(
                "app.integrations.telegram.handlers.get_or_create_telegram_conversation_full",
                new=AsyncMock(return_value=fake_conv),
            ),
        ):
            result = await handle_plain_message(
                sender=sender, text="what is RAG?", session=session
            )

        assert isinstance(result, TelegramTurnContext)
        assert result.nexus_user_id == nexus_uid
        assert result.conversation_id == conv_id
        assert isinstance(result.model_id, str)

    async def test_bound_user_uses_conversation_model_override(self) -> None:
        """When conversation.model_id is set it must propagate into the context."""
        nexus_uid = uuid.uuid4()
        conv_id = uuid.uuid4()
        sender = TelegramSender(
            user_id=42, chat_id=42, username="tavi", full_name="Tavi"
        )
        session = AsyncMock()

        fake_conv = AsyncMock()
        fake_conv.id = conv_id
        fake_conv.model_id = "anthropic/claude-opus-4-5"

        with (
            patch(
                "app.integrations.telegram.handlers.get_user_id_for_external",
                new=AsyncMock(return_value=nexus_uid),
            ),
            patch(
                "app.integrations.telegram.handlers.get_or_create_telegram_conversation_full",
                new=AsyncMock(return_value=fake_conv),
            ),
        ):
            result = await handle_plain_message(
                sender=sender, text="hey", session=session
            )

        assert isinstance(result, TelegramTurnContext)
        assert result.model_id == "anthropic/claude-opus-4-5"


# ---------------------------------------------------------------------------
# handle_stop_command
# ---------------------------------------------------------------------------


class TestHandleStopCommand:
    """handle_stop_command is a plain synchronous function — no anyio needed."""

    def test_stop_with_running_task(self) -> None:
        """Returns the 'stopped' message when was_running=True."""
        reply = handle_stop_command(was_running=True)
        assert "⏹" in reply or "stop" in reply.lower()

    def test_stop_with_no_running_task(self) -> None:
        """Returns the 'nothing running' message when was_running=False."""
        reply = handle_stop_command(was_running=False)
        assert "nothing" in reply.lower() or "running" in reply.lower()

    def test_stop_returns_string(self) -> None:
        """handle_stop_command always returns a plain string."""
        for flag in (True, False):
            assert isinstance(handle_stop_command(was_running=flag), str)


# ---------------------------------------------------------------------------
# handle_model_command
# ---------------------------------------------------------------------------


@pytest.mark.anyio
class TestHandleModelCommand:
    async def test_missing_model_arg_returns_usage(self) -> None:
        """Calling /model with no argument returns the usage hint."""
        sender = TelegramSender(user_id=1, chat_id=1, username=None, full_name=None)
        session = AsyncMock()
        reply = await handle_model_command(
            sender=sender, model_arg="", session=session
        )
        assert "usage" in reply.lower() or "/model" in reply.lower()

    async def test_unknown_model_prefix_returns_error(self) -> None:
        """A model ID with an unrecognised prefix must be rejected before any DB call."""
        sender = TelegramSender(user_id=1, chat_id=1, username=None, full_name=None)
        session = AsyncMock()
        reply = await handle_model_command(
            sender=sender, model_arg="openai-gpt-4o-no-prefix", session=session
        )
        assert isinstance(reply, str)
        # Should contain a prefix hint, not a success message.
        assert "✅" not in reply
        assert "google/" in reply or "anthropic/" in reply or "prefix" in reply.lower()

    async def test_unbound_user_returns_error(self) -> None:
        """An unbound sender cannot switch models."""
        sender = TelegramSender(user_id=2, chat_id=2, username=None, full_name=None)
        session = AsyncMock()
        with patch(
            "app.integrations.telegram.handlers.get_user_id_for_external",
            new=AsyncMock(return_value=None),
        ):
            reply = await handle_model_command(
                sender=sender, model_arg="google/gemini-3-flash-preview", session=session
            )
        assert isinstance(reply, str)
        assert "connect" in reply.lower() or "account" in reply.lower()

    async def test_valid_model_switch_replies_ok(self) -> None:
        """A bound user switching to a valid model gets the success message."""
        nexus_uid = uuid.uuid4()
        conv_id = uuid.uuid4()
        sender = TelegramSender(user_id=3, chat_id=3, username="t", full_name="T")
        session = AsyncMock()

        fake_conv = AsyncMock()
        fake_conv.id = conv_id
        fake_conv.model_id = None

        with (
            patch(
                "app.integrations.telegram.handlers.get_user_id_for_external",
                new=AsyncMock(return_value=nexus_uid),
            ),
            patch(
                "app.integrations.telegram.handlers.get_or_create_telegram_conversation_full",
                new=AsyncMock(return_value=fake_conv),
            ),
            patch(
                "app.integrations.telegram.handlers.update_conversation_model",
                new=AsyncMock(return_value=True),
            ),
        ):
            reply = await handle_model_command(
                sender=sender,
                model_arg="anthropic/claude-opus-4-5",
                session=session,
            )

        assert "anthropic/claude-opus-4-5" in reply
        assert "✅" in reply

    async def test_update_failure_returns_error_message(self) -> None:
        """When the DB update fails the user gets an error string, not an exception."""
        nexus_uid = uuid.uuid4()
        conv_id = uuid.uuid4()
        sender = TelegramSender(user_id=4, chat_id=4, username="t", full_name="T")
        session = AsyncMock()

        fake_conv = AsyncMock()
        fake_conv.id = conv_id
        fake_conv.model_id = None

        with (
            patch(
                "app.integrations.telegram.handlers.get_user_id_for_external",
                new=AsyncMock(return_value=nexus_uid),
            ),
            patch(
                "app.integrations.telegram.handlers.get_or_create_telegram_conversation_full",
                new=AsyncMock(return_value=fake_conv),
            ),
            patch(
                "app.integrations.telegram.handlers.update_conversation_model",
                new=AsyncMock(return_value=False),
            ),
        ):
            reply = await handle_model_command(
                sender=sender,
                model_arg="google/gemini-3-flash-preview",
                session=session,
            )

        assert isinstance(reply, str)
        assert "couldn't" in reply.lower() or "fail" in reply.lower() or "try" in reply.lower()
