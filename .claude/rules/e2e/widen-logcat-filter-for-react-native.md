---
name: widen-logcat-filter-for-react-native
paths: ["**/*.yaml", "**/*.yml", "**/*.{kt,java}"]
---

# Widen logcat Filter Pattern for React Native Debugging - Default Tag Misses Most Logs

Category: e2e
Tags: [android, logcat, react-native, debugging]

## Rule

Include `ReactNativeJS:V hermes:V AndroidRuntime:E` in logcat filters when debugging React Native E2E failures, not just your app's tags.

## Why

Native code (SurfaceActivity, Auth0Service) logging confirms the native side works, but JS errors are invisible without `ReactNativeJS` and `hermes` tags. A surface that "mounted successfully" in logcat but shows nothing in Maestro means a JS runtime error — which only appears in ReactNativeJS or hermes logcat output.

## Examples

### Bad

```bash
adb logcat -s SurfaceActivity:V Auth0Service:V  # Misses JS errors
```

### Good

```bash
adb logcat -s SurfaceActivity:V Auth0Service:V ReactNativeJS:V hermes:V AndroidRuntime:E
```

## References

- a prior E2E project: Android surfaces mounted successfully but RN content never rendered; JS errors were invisible

## Verify

When Android logs show "mounted successfully" but content doesn't render in Maestro: widen the logcat filter to include `ReactNativeJS:V` and `hermes:V` to see JS runtime errors.

## Patterns

### Pattern (bad)

```bash
adb logcat -s SurfaceActivity:V Auth0Service:V  # Misses JS errors
```

### Pattern (good)

```bash
adb logcat -s SurfaceActivity:V Auth0Service:V ReactNativeJS:V hermes:V AndroidRuntime:E
```
