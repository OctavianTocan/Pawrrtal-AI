"""Provider package — public surface for the AI provider abstraction."""

from .base import AILLM, StreamEvent
from .catalog import default_model
from .claude_provider import ClaudeLLM, ClaudeLLMConfig
from .factory import resolve_llm

__all__ = [
    "AILLM",
    "ClaudeLLM",
    "ClaudeLLMConfig",
    "StreamEvent",
    "default_model",
    "resolve_llm",
]
