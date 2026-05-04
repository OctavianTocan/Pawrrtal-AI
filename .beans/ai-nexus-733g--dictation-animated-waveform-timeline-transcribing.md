---
# ai-nexus-733g
title: 'Dictation: animated waveform timeline + transcribing spinner + send guard'
status: completed
type: feature
priority: high
created_at: 2026-05-04T22:01:45Z
updated_at: 2026-05-04T22:28:13Z
---

Replace the current static voice meter with a scrolling waveform + transcribing state.

## Behavior
- While recording: render a horizontal scrolling waveform of mic level (timeline-of-audio style)
- Stop button: while recording, square stop icon
- Replace stop button with a spinner while transcribing
- Disable Send button until transcription completes
- Disable mic button while transcribing

Done — scrolling waveform timeline + spinner-on-stop + send disabled until transcription done.
