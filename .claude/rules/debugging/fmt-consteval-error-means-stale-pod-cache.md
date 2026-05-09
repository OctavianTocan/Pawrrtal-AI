---
name: fmt-consteval-error-means-stale-pod-cache
paths: [".no-match"]
---

# fmt consteval Compilation Errors After an Xcode Upgrade Mean Stale CocoaPods Artifacts - Clean Build

`consteval` compilation errors in the `fmt` library after an Xcode version change indicate a stale CocoaPods cache. Clean the cache instead of patching fmt.

## Rule

```bash
pod cache clean --all
rm -rf ios/Pods ios/build
cd ios && pod install
```

## Why

`fmt` uses C++20 `consteval` which is handled differently across Xcode/clang versions. When Xcode is upgraded, the cached pre-compiled fmt artifacts from the old clang become incompatible. The error message points at fmt source code, making it look like a library bug. It's stale artifacts.

## Verify

"After upgrading Xcode, am I seeing consteval errors in fmt? Did I clean the CocoaPods cache before assuming it's a library bug?"

## Patterns

Bad — patching fmt after Xcode upgrade:

```bash
# Upgrade Xcode, see consteval error in fmt
# Start investigating fmt source code
# Try pinning a different fmt version
# Try adding compiler flags
# All fail — the cached artifacts from old clang are still there
```

Good — clean caches when consteval errors appear after Xcode change:

```bash
# Upgrade Xcode, see consteval error in fmt
# Recognize: stale pre-compiled artifacts from old clang
pod cache clean --all
rm -rf ios/Pods ios/build
cd ios && pod install
# Build succeeds — fresh artifacts compiled with new clang
```
