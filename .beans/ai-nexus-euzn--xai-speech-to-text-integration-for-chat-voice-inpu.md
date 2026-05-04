---
# ai-nexus-euzn
title: xAI Speech-to-Text integration for chat voice input
status: completed
type: feature
priority: high
created_at: 2026-05-04T20:57:52Z
updated_at: 2026-05-04T21:08:21Z
---

Wire up the existing chat voice-input button to xAI's Speech-to-Text API.

## API details
- Endpoint: POST https://api.x.ai/v1/stt (multipart/form-data, file last)
- Auth: Bearer XAI_API_KEY (server-only — never client-exposed)
- WebSocket streaming: wss://api.x.ai/v1/stt with query params
- Recommended: 16 kHz PCM, language=en, format=true

## Backend
- Add XAI_API_KEY to backend env (user said they'll add it)
- New endpoint POST /api/v1/stt that proxies to xAI (multipart passthrough)
- Optional follow-up: WS proxy at /api/v1/stt/stream for live transcription

## Frontend
- Use the existing mic button in chat composer
- Tap-to-record → recorded blob → POST /api/v1/stt → insert transcript into composer
- Show recording state (pulsing mic) while capturing

## Decisions to confirm at start
- Single-shot upload (record → stop → upload) or live streaming?
- Replace composer text or insert at cursor?

## Summary of Changes

### Backend
- New \`xai_api_key\` setting in app/core/config.py (defaults to "" — endpoint returns 503 with a clear "not configured" message when missing).
- New POST /api/v1/stt proxy in app/api/stt.py: accepts multipart audio, forwards to https://api.x.ai/v1/stt with the configured Bearer token, returns the upstream JSON. Caps audio at 25 MB, 60 s timeout, surfaces upstream error bodies on 4xx/5xx.
- Wired into main.py via get_stt_router().

### Frontend
- New useVoiceTranscribe hook in features/chat/hooks (MediaRecorder-based recorder + POST to backend proxy).
- Replaced ChatComposer's browser SpeechRecognition flow with the new hook. Mic button now records via MediaRecorder, surfaces a "Transcribing…" disabled state with a pulse animation between stop and transcript arrival.
- API_ENDPOINTS gained an \`stt.transcribe\` entry.

### Verified
- Backend route imports cleanly (uv run python -c "from app.api.stt ...").
- Frontend tsc + biome clean.

### Decisions left for follow-up
- Single-shot upload only this round; the WebSocket streaming variant (/v1/stt over wss) is not wired (would need a backend WS proxy + frontend chunked upload).
- Behaviour: stop button replaces composer content with the transcript; stop+send sends immediately. No "insert at cursor" pathway yet.
