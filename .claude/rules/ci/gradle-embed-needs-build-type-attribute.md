---
name: gradle-embed-needs-build-type-attribute
paths: [".no-match"]
---

# Gradle embed() Needs BuildTypeAttr for Multi-Variant Dependencies - Add It or Get Resolution Errors

When using the brownfield plugin's `embed()` dependency type for libraries that publish multiple variants (debug, debugOptimized, release), you must set `BuildTypeAttr` on the embed configuration. Without it, Gradle fails with "Cannot choose between the available variants."

## Rule

After switching `api()` to `embed()` for react-android or hermes-android:

```kotlin
configurations.matching { it.name.contains("embed", ignoreCase = true) }.configureEach {
    attributes {
        attribute(
            com.android.build.api.attributes.BuildTypeAttr.ATTRIBUTE,
            objects.named(com.android.build.api.attributes.BuildTypeAttr::class.java, "release"),
        )
    }
}
```

## Why

The brownfield plugin's `embed` configuration doesn't inherit `BuildTypeAttr` from the Android build type. When a dependency publishes 3 variants (debug, debugOptimized, release), Gradle has no way to disambiguate. The error message tells you exactly what to do ("Add this attribute to the consumer's configuration") but doesn't tell you which configuration to modify.

## Verify

"Does the embed configuration have an explicit `BuildTypeAttr` set to `release`? Does `./gradlew dependencies` resolve the embed variant without 'Cannot choose' errors?"

## Patterns

Bad — embed without attribute disambiguation:

```kotlin
dependencies {
    embed("com.facebook.react:react-android:0.76.0")
    // Gradle error: "Cannot choose between the available variants of com.facebook.react:react-android"
}
```

Good — set BuildTypeAttr on embed configurations:

```kotlin
configurations.matching { it.name.contains("embed", ignoreCase = true) }.configureEach {
    attributes {
        attribute(
            com.android.build.api.attributes.BuildTypeAttr.ATTRIBUTE,
            objects.named(com.android.build.api.attributes.BuildTypeAttr::class.java, "release"),
        )
    }
}

dependencies {
    embed("com.facebook.react:react-android:0.76.0")
}
```
