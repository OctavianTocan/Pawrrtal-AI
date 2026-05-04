---
name: use-api-not-embed-for-react-native-gradle
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# Use api() Not embed() for react-android/hermes-android - Embedding Causes Duplicate Class Errors

The brownfield Gradle plugin bundles codegen `.so` files by default. Using `embed()` on `react-android` or `hermes-android` causes duplicate class errors because the consumer also resolves them transitively via the POM's `api()` declarations. Three iterations proved this: v0.3.0 embed-only (ClassNotFound), v0.3.1 embed+api (Duplicate class), v0.3.2 api-only + explicit transitives (clean).

## Verify

"When configuring brownfield AAR dependencies: is `embed()` used for anything other than the brownfield module's own native code? Will the consumer get duplicate classes?"

## Patterns

Bad — causes duplicate classes because consumer also gets react-android via POM:

```kotlin
// Causes duplicate classes — consumer also gets react-android via POM
embed(project(":react-android"))
api(project(":react-android"))
```

Good — api() only, brownfield plugin already bundles .so files:

```kotlin
// api() only — brownfield plugin already bundles .so files
api(project(":react-android"))
api(project(":hermes-android"))
// Plus explicit api() for all 20 optional transitive deps
```
