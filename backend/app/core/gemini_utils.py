"""Lightweight Gemini helpers for one-off, non-streaming calls."""

from __future__ import annotations

from typing import Any

from google import genai
from google.genai import types
from sigil_sdk import GenerationStart, ModelRef, assistant_text_message, user_text_message

from app.core.config import settings
from app.core.telemetry.sigil_gemini import gemini_usage_to_token_usage, log_recorder_err
from app.core.telemetry.sigil_runtime import get_sigil_client

_DEFAULT_MODEL = "gemini-2.0-flash"
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Return a shared Gemini client, creating it on first call."""
    global _client  # noqa: PLW0603
    if _client is None:
        _client = genai.Client(api_key=settings.google_api_key)
    return _client


async def generate_content_sync_recorded(
    client: genai.Client,
    model_id: str,
    user_prompt: str,
    *,
    pipeline_tag: str = "gemini-sync",
) -> str:
    """Single-shot ``generate_content`` with optional Grafana Sigil SYNC recording."""
    sigil_client = get_sigil_client()
    rec: Any | None = None
    if sigil_client is not None:
        rec = sigil_client.start_generation(
            GenerationStart(
                model=ModelRef(provider="google", name=model_id),
                operation_name="generateContent",
                tags={"pipeline": pipeline_tag, "layer": "utility"},
            ),
        )
        rec.__enter__()

    try:
        response = await client.aio.models.generate_content(
            model=model_id,
            contents=[
                types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)]),
            ],
        )
        text = (response.text or "").strip()
        if rec is not None:
            result_kw: dict[str, Any] = {
                "input": [user_text_message(user_prompt)],
                "output": [assistant_text_message(text)] if text else [],
                "stop_reason": "stop",
                "response_model": model_id,
            }
            usage_meta = getattr(response, "usage_metadata", None)
            if usage_meta is not None:
                result_kw["usage"] = gemini_usage_to_token_usage(usage_meta)
            rec.set_result(**result_kw)
            log_recorder_err("Sigil Gemini sync generation", rec)
        return text
    except Exception as exc:
        if rec is not None:
            rec.set_call_error(exc)
        raise
    finally:
        if rec is not None:
            rec.__exit__(None, None, None)


async def generate_text_once(prompt: str, model_id: str = _DEFAULT_MODEL) -> str:
    """Send a single prompt to Gemini and return the text response.

    Used for short utility tasks such as title generation.  Raises on
    API errors so the caller can decide how to handle them.
    """
    return await generate_content_sync_recorded(
        _get_client(),
        model_id,
        prompt,
        pipeline_tag="gemini-utils",
    )
