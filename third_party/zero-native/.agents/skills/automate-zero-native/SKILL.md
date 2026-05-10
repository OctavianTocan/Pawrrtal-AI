---
name: automate-zero-native
description: Automate and inspect running zero-native WebView shell apps via the built-in automation server. Use when the user asks to test the app, list windows, take a screenshot, inspect a snapshot, reload the WebView, or verify a running zero-native example.
---

# Automate zero-native apps

zero-native has a built-in automation system for inspecting running WebView shell apps. It works through file-based IPC in `.zig-cache/zero-native-automation/`.

## Prerequisites

Run an app with automation enabled:

```bash
zig build run-webview -Dplatform=macos -Dautomation=true
```

## Commands

```bash
zig build
zig-out/bin/zero-native automate list
zig-out/bin/zero-native automate snapshot
zig-out/bin/zero-native automate screenshot [path]
zig-out/bin/zero-native automate reload
```

## Workflow

1. Start the app with automation enabled.
2. Run `zig-out/bin/zero-native automate snapshot` to confirm the window and WebView source.
3. Use `zig-out/bin/zero-native automate reload` to request a reload.
4. Use `zig-out/bin/zero-native automate screenshot [path]` when a placeholder screenshot artifact is enough.

## Notes

- Automation is compile-time gated: apps built without `-Dautomation=true` ignore automation files.
- The current screenshot artifact is a placeholder PPM.
- WebView DOM interaction is intentionally out of scope for this file-based automation layer.
