---
name: ios-audio-tap-format-nil
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Pass format: nil for Audio Taps on iOS - Explicit Format Mismatches Crash with AirPods

## Rule

When installing audio taps on iOS, pass `format: nil` to let the system choose. Do NOT use `inputNode.outputFormat(forBus: 0)` as the tap format.

## Why

`outputFormat(forBus: 0)` returns the hardware's current format, which changes based on connected audio devices. AirPods switch between mono and stereo depending on whether the mic is active. Passing the wrong format crashes the audio engine with a format mismatch exception.

## Bad

```swift
let format = engine.inputNode.outputFormat(forBus: 0)
engine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { ... }
```

## Good

```swift
engine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: nil) { ... }
```

## Origin

TwinMind iOS app — AirPods switching between phone call (mono) and music (stereo) caused format mismatch crashes.

## Verify

Test audio tap with multiple devices:

1. Connect AirPods
2. Install tap and verify it works
3. Make a phone call (triggers mono switch)
4. Return to app — tap should still work
5. Disconnect AirPods, connect external headphones
6. Tap should still work

## Patterns

- **Nil Format**: Always pass `format: nil` for installTap unless you need specific processing
- **Format Inspection**: If you must inspect format, use it only for logging/debugging, not for tap installation
- **Device Change Listener**: Register for route change notifications to detect audio device switches
- **Fallback Tap**: If tap installation fails, fall back to polling inputNode for audio level metering
