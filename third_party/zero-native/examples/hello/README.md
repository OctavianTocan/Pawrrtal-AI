# Hello Example

A minimal zero-native app that displays inline HTML in the system WebView.

## Run

```bash
zig build run
```

## Using outside the repo

This example references zero-native via relative path (`../../`). To use it standalone, override the path:

```bash
zig build run -Dzero-native-path=/path/to/zero-native
```

Or, when a published Zig package is available, replace `default_zero_native_path` in `build.zig` with the package URL and add it to `build.zig.zon` dependencies.
