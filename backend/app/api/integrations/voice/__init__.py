"""Pluggable voice-transcription backends.

Selected by ``settings.voice_provider`` — one of:

* ``xai`` (default; existing ``api/stt.py`` proxy stays the route)
* ``mistral`` (Voxtral)
* ``openai`` (Whisper)
* ``local`` (whisper.cpp via ffmpeg subprocess)

The non-xAI backends share the :class:`Transcriber` Protocol so the
``api/stt.py`` route can dispatch on ``settings.voice_provider``
without knowing which backend is wired up.
"""

from app.api.integrations.voice.transcriber import (
    LocalWhisperCppTranscriber,
    MistralVoxtralTranscriber,
    OpenAIWhisperTranscriber,
    Transcriber,
    TranscriptionError,
    resolve_transcriber,
)

__all__ = [
    "LocalWhisperCppTranscriber",
    "MistralVoxtralTranscriber",
    "OpenAIWhisperTranscriber",
    "Transcriber",
    "TranscriptionError",
    "resolve_transcriber",
]
