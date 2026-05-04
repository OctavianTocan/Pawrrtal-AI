---
name: split-xcframeworks-per-arch-not-monolithic
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# Ship Three Separate xcframeworks (hermes, react-native, callstack) Not One Monolithic Bundle

The brownfield CLI produces three separate XCFrameworks: the main SDK, ReactBrownfield (the bridge), and hermesvm (the JS engine). Linking only the main XCFramework compiles successfully because types resolve from `.swiftinterface`, but the app crashes instantly at runtime because the Hermes engine and bridge binaries aren't loaded.

Link ALL three XCFrameworks from the brownfield CLI output (main SDK + ReactBrownfield + hermesvm) — the CLI produces three, not one.

## Verify

"Did I include all three XCFrameworks from the brownfield CLI output, or just the main one?"

## Patterns

Bad — only the main framework, compiles but crashes:

```yaml
# project.yml — only the main framework, compiles but crashes
dependencies:
  - framework: "path/to/TwinMindDigestBrownfield.xcframework"
    embed: true
```

Good — all three XCFrameworks:

```yaml
# project.yml — all three XCFrameworks
dependencies:
  - framework: "path/to/TwinMindDigestBrownfield.xcframework"
    embed: true
  - framework: "path/to/ReactBrownfield.xcframework"
    embed: true
  - framework: "path/to/hermesvm.xcframework"
    embed: true
```

This was the cause of 5/5 surface crashes in one CI iteration.
