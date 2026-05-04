---
name: declare-react-android-optional-deps-explicitly
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# react-android Marks All 19 Dependencies as Optional in POM - Declare Them Explicitly or Get ClassNotFoundException

react-android 0.83.6 marks ALL 19 of its transitive dependencies as `<optional>true</optional>` in its Maven POM. Optional deps don't resolve transitively, even through `api()`. Without explicit declarations, consumers get ClassNotFoundException for soloader, fbjni, fresco, and 16 other packages. The brownfield publish workflow must inject explicit `api()` lines for all 20 deps (19 react-android + 1 unique hermes-android: `androidx.annotation:annotation`).

## Verify

"When publishing a brownfield AAR: does the build script explicitly declare all optional transitive dependencies? Will consumers get ClassNotFoundException?"

## Patterns

Bad — only declares top-level deps, 19 optional transitives are invisible:

```kotlin
// Only declares the top-level deps — 19 optional transitives are invisible
api("com.facebook.react:react-android:0.83.6")
api("com.facebook.react:hermes-android:0.83.6")
```

Good — all optional transitives declared explicitly:

```kotlin
api("com.facebook.react:react-android:0.83.6")
api("com.facebook.react:hermes-android:0.83.6")
// All 19 optional react-android transitives
api("androidx.appcompat:appcompat:1.7.0")
api("com.facebook.fbjni:fbjni:0.7.0")
api("com.facebook.fresco:fresco:3.6.0")
// ... (20 total)
api("androidx.annotation:annotation:1.6.0") // hermes-android unique
```
