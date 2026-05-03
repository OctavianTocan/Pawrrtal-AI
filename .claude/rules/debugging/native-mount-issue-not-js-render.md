---
name: native-mount-issue-not-js-render
paths: ["**/*"]
---

# When a Native View Mounts Incorrectly, Fix the Native Layout - Not the JS Render

Category: debugging
Tags: [react-native, brownfield, debugging]

## Rule

"Surface mounted successfully" in native logs does not mean React Native content rendered. Verify the JS bundle exists, loads, and the component tree renders by checking the accessibility hierarchy.

## Why

In brownfield apps, native code creates a ReactNativeView and adds it to the layout. This native operation always succeeds if the bridge initializes. But the JS bundle might be missing from the APK/IPA, might crash on load, or might render an error boundary instead of the expected screen. Native success + blank screen = JS problem.

## Verify

When a native surface mounts successfully but shows blank content: have you verified the JS bundle exists and loads correctly?

## Patterns

### Pattern (bad)

```text
# Assuming native success = JS success
Logcat: "Surface mounted successfully" → must be a native layout issue
# But the JS bundle is missing from the APK
```

### Pattern (good)

```text
# Proper diagnosis checklist
1. Logcat shows "Surface mounted successfully" → native OK
2. Check: is index.android.bundle in APK? (unzip -l)
3. Check: ReactNativeJS logcat for JS errors
4. Check: maestro hierarchy for rendered elements
5. If blank: JS bundle missing or JS crash
```

## References

- TwinMind E2E: All 3 Android surfaces "mounted successfully" but RN content never appeared
