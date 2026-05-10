# iOS Example

A minimal iOS host app that embeds a zero-native static library from Swift.

## Build the native library

Build or package an iOS static library from the repository root, then copy it into this example:

```bash
zig build lib -Dtarget=aarch64-ios
mkdir -p examples/ios/Libraries
cp zig-out/lib/libzero-native.a examples/ios/Libraries/libzero-native.a
```

The Xcode project expects the library at `Libraries/libzero-native.a` and the C header at `ZeroNativeIOSExample/zero_native.h`.

## Run

Open the project in Xcode:

```bash
open examples/ios/ZeroNativeIOSExample.xcodeproj
```

Select a simulator or device and run the `ZeroNativeIOSExample` scheme.

## Files

- `ZeroNativeIOSExample/ZeroNativeHostViewController.swift` hosts a `WKWebView` and calls the zero-native C ABI.
- `ZeroNativeIOSExample/zero_native.h` declares the C ABI expected from `libzero-native.a`.
- `app.zon` records the mobile example metadata for zero-native tooling.
