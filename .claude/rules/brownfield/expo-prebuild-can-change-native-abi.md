---
name: expo-prebuild-can-change-native-abi
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile"]
---

# Expo Prebuild Patches React Native Source, Changing .so ABI - Verify Compatibility After Prebuild

Expo's `npx expo prebuild` patches React Native C++ source before compilation. The codegen `.so` files (libreact_codegen_rnscreens.so, libappmodules.so, etc.) get compiled against patched headers with different struct layouts than stock RN. When the consumer app pulls `libreactnative.so` from Maven Central (stock RN), the struct field offsets don't match, causing SIGSEGV during Fabric UIManager initialization.

Same version string (0.83.6) doesn't mean same ABI. Expo adds fields to C++ props structs that stock RN doesn't have. The codegen `.so` writes to memory offsets that don't exist in the stock struct layout.

## Verify

"After running expo prebuild, are the codegen .so files and libreactnative.so from the same compilation? Or could there be an ABI mismatch?"

## Patterns

Bad — consumer resolves stock react-android, ABI mismatch with prebuilt codegen:

```kotlin
// AAR declares api() — consumer gets stock Maven .so files
api("com.facebook.react:react-android:0.83.6")
api("com.facebook.hermes:hermes-android:0.83.6")
// codegen .so was compiled against Expo-patched headers
// → SIGSEGV in HostPlatformViewProps during Fabric setup
```

Good — embed matching .so files inside the AAR:

```kotlin
// In the publish workflow, sed the generated build.gradle.kts:
// api("com.facebook.react:react-android:...") → embed("com.facebook.react:react-android:...")
// api("com.facebook.hermes:hermes-android:...") → embed("com.facebook.hermes:hermes-android:...")
// Bundles the matching .so files inside the AAR so codegen and runtime come from same compilation
```

Symptoms: SIGSEGV in `HostPlatformViewProps::HostPlatformViewProps()` called from any codegen props constructor during `ComponentDescriptorRegistry::add()`. Crash happens before any JS runs, during Fabric setup. `readelf` symbol analysis shows all function symbols resolve, but the crash is a struct layout mismatch (field offsets), which isn't visible in dynamic symbol tables.
