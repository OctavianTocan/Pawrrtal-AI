---
name: audio-buffer-async-not-sync-queue
paths: ["**/*.{ts,tsx,kt,swift}"]
---

# Audio Buffer Queue Operations Must Use .async Not .sync - Sync Blocks the Real-Time Audio Thread

## Rule

Audio buffer queue operations must use `.async`, never `.sync(flags: .barrier)` on the real-time audio thread.

## Why

The audio render thread has hard real-time constraints. Calling `.sync(flags: .barrier)` blocks the render thread waiting for the barrier to complete. If any other work is queued, this deadlocks and the audio engine stops.

## Bad

```swift
audioBufferQueue.sync(flags: .barrier) {
    buffer.append(audioData)
}
```

## Good

```swift
audioBufferQueue.async {
    buffer.append(audioData)
}
```

## Origin

TwinMind iOS — deadlocked audio engine when barrier sync blocked the real-time thread.

## Verify

- Run audio under load (background apps, memory pressure): confirm no deadlock or audio dropout
- Instrument the audio thread with `os_signpost`: confirm no `.sync()` calls on the render thread
- Check `Thread timeRecorder` for the audio thread: sustained blocking indicates improper queue usage

## Patterns

- **Always use `.async` for buffer queue operations:** Append, resize, and flush operations on `AVAudioEngine` buffer queues must be async
- **Use `.sync()` only on non-real-time threads:** If you must synchronize, do so on a dedicated dispatch queue, never on the audio render thread
- **Set `.barrier` on the queue itself, not via `.sync(flags: .barrier)`:** Use a barrier flag when submitting work to a concurrent queue, not blocking sync calls
- **Profile with Instruments Audio Debug:** Check for "Audio engine deadlocks" and "Render thread blocked" warnings
