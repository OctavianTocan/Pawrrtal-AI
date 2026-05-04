---
name: soloader-native-libs-mapping-rn83
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# RN 0.83 Merged Native Libs Directories - SoLoader Mapping Must Match

In RN 0.83, several `.so` files (`librninstance.so`, `libfabricjni.so`, `libreact_featureflagsjni.so`) were merged into `libreactnative.so`. `OpenSourceMergedSoMapping` redirects SoLoader requests at runtime. Without it, loading any pre-merge library name fails with `SoLoaderDSONotFoundError`.

Pass `OpenSourceMergedSoMapping` to `SoLoader.init()` in RN 0.83+ brownfield consumers — passing `false` causes `SoLoaderDSONotFoundError`. Also call `DefaultNewArchitectureEntryPoint.load()` before brownfield init.

## Verify

"Am I using RN 0.83+ with SoLoader? Did I pass OpenSourceMergedSoMapping instead of false?"

## Patterns

Bad — missing merged mapping, crashes with SoLoaderDSONotFoundError:

```kotlin
// Missing merged mapping — crashes with SoLoaderDSONotFoundError
SoLoader.init(this, false)
ReactNativeBrownfield.initialize(this, emptyList())
```

Good — correct init sequence for RN 0.83+ brownfield:

```kotlin
// Correct init sequence for RN 0.83+ brownfield
SoLoader.init(this, OpenSourceMergedSoMapping)
DefaultNewArchitectureEntryPoint.load()
ReactNativeBrownfield.initialize(this, emptyList())
```

See facebook/react-native#46036 — .so merge PR.
