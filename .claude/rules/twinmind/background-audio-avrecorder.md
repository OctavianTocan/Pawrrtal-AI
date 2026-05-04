---
name: background-audio-avrecorder
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# iOS Background Audio: AVAudioRecorder Only

For iOS background audio recording, use AVAudioRecorder exclusively. AVAudioEngine fails silently when the app enters background.

## Rule

AVAudioEngine's audio graph is suspended by iOS when the app backgrounds, even with the `audio` background mode capability enabled. AVAudioRecorder is the only API that reliably continues recording in the background.

## Why

AVAudioEngine produces zero-length or corrupted audio files when the user switches apps during a meeting recording. The failure is completely silent: no error, no callback, no crash. The user thinks they're recording but the output is empty.

## Verify

Test background audio by:

1. Start a recording
2. Switch to another app (press Home)
3. Wait 30+ seconds
4. Return to the app
5. Check the recorded file size/duration

AVAudioRecorder should produce valid audio. AVAudioEngine will produce empty or near-empty files.

## Patterns

- **Dual Engine**: Use AVAudioRecorder for background recording; use AVAudioEngine for real-time processing when app is foregrounded
- **Format Preamble**: Before recording starts, configure AVAudioSession for background (mixWithOthers, category: .playAndRecord)
- **Background Check**: On app foreground, validate the current recording file is growing in size
