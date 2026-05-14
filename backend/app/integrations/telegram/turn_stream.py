"""Persistence-aware Telegram LLM turn streaming helpers.

REBUILD STUB — bean ``pawrrtal-k4z0`` (Phase 9) has the full spec.

This is the wrapper that puts Telegram on the same persistence path as
web. The bug commit ``859569bc`` exists because an earlier version of
the bot called the provider with ``history=[]`` every turn.
"""

# TODO(pawrrtal-k4z0): one public entry point, three private helpers.
#   The public one is the coordinator; the helpers split the phases so
#   each can have its own session lifecycle.

# TODO(pawrrtal-k4z0): the history window matches the web endpoint. Look
#   at how the web path does it — the constant lives somewhere shared.

# TODO(pawrrtal-k4z0): two database writes happen BEFORE streaming
#   starts (user row + assistant placeholder), in one short transaction.
#   Why short and committed early? The stream can take 30+ seconds; a
#   session held that long blocks pool slots.

# TODO(pawrrtal-k4z0): the assistant row is inserted as "streaming" and
#   has to be finalized after the stream ends. ALWAYS. Even on
#   cancellation, even on exception. If you skip the finalization, the
#   web UI shows it as in-progress forever.

# TODO(pawrrtal-k4z0): the provider's stream can raise mid-iteration.
#   Wrap it in a generator that converts exceptions to terminal error
#   events. The channel's deliver loop never sees a Python exception
#   that way — it sees a stream event with type="error" — and the
#   aggregator captures it for persistence.

# TODO(pawrrtal-k4z0): CancelledError must propagate. Catch it only to
#   record the final status, then re-raise.

# TODO(pawrrtal-k4z0): the ChannelMessage metadata is where the
#   aiogram-specific routing context travels (bot, chat_id, placeholder
#   message_id). The "core" never reads this — only the TelegramChannel
#   adapter does.

# TODO(pawrrtal-k4z0): an empty tools list and a non-empty one mean
#   different things to providers. Pass None when empty.
