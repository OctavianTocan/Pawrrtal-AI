---
name: check-actual-abi-before-fixing-linker
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# Use readelf to Verify Real ABI Before Attempting .so Linker Fixes

SIGSEGV crashes in brownfield AARs can come from ABI mismatch (different `libreactnative.so` binaries) OR multi-DEX ClassLoader corruption. The fix is completely different for each. A 15-line `readelf -n` comparison CI job answers the question definitively in one run. Without it, you waste cycles on `componentDescriptors: []` (which only fixes multi-DEX) when the real issue is ABI mismatch (which needs `dynamicLibs` bundling).

Ship a `readelf` diagnostic CI job comparing build IDs BEFORE writing any native crash fix — fixes without binary evidence are guesses.

## Verify

"Am I fixing a native crash based on a theory, or do I have binary evidence? Did I compare build IDs with readelf?"

## Patterns

Bad — guessing it's multi-DEX without evidence:

```js
// Guessing it's multi-DEX without evidence
module.exports = {
  dependencies: {
    "react-native-screens": {
      platforms: { android: { componentDescriptors: [] } }
    }
  }
};
```

Good — diagnostic CI job compares build IDs first:

```bash
# Diagnostic CI job — compare build IDs first
unzip -o brownfield.aar -d /tmp/aar
readelf -n /tmp/aar/jni/arm64-v8a/libreactnative.so | grep "Build ID"
# Compare against stock Maven react-android
readelf -n maven-react-android/jni/arm64-v8a/libreactnative.so | grep "Build ID"
# Different build IDs? → ABI mismatch → dynamicLibs
# Same build IDs? → multi-DEX → componentDescriptors: []
```

TwinMind ABI mismatch confirmed after multi-DEX theory wasted 3 iterations.
