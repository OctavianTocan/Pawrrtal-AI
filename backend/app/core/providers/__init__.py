"""Provider package — public surface for the AI provider abstraction."""
from .base import AIProvider, StreamEvent
from .claude_provider import ClaudeProvider, ClaudeProviderConfig
from .factory import resolve_provider

__all__ = [
    "AIProvider",
    "ClaudeProvider",
    "ClaudeProviderConfig",
    "StreamEvent",
    "resolve_provider",
]
