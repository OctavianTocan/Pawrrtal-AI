# Android Example

A minimal Android host app that embeds a zero-native static library through JNI.

## Build the native library

Build or package an Android static library from the repository root, then copy it into this example:

```bash
zig build lib -Dtarget=aarch64-linux-android
mkdir -p examples/android/app/src/main/cpp/lib
cp zig-out/lib/libzero-native.a examples/android/app/src/main/cpp/lib/libzero-native.a
```

The CMake project expects the library at `app/src/main/cpp/lib/libzero-native.a` and the C header at `app/src/main/cpp/zero_native.h`.

## Run

Open `examples/android` in Android Studio, or build from the command line with a configured Android SDK:

```bash
./gradlew :app:assembleDebug
```

Install on an emulator or device:

```bash
./gradlew :app:installDebug
```

## Files

- `app/src/main/java/dev/zero_native/examples/android/MainActivity.kt` hosts a `SurfaceView` and calls the JNI bridge.
- `app/src/main/cpp/zero_native_jni.c` forwards JNI calls to the zero-native C ABI.
- `app/src/main/cpp/CMakeLists.txt` imports `libzero-native.a` and builds the JNI shared library.
- `app.zon` records the mobile example metadata for zero-native tooling.
