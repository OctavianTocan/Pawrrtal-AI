---
name: expo-prebuild-clears-gradle-cache
paths: ["**/*"]
---

# Expo Prebuild Regenerates android/ From Scratch - Gradle Cache Keys Must Hash Source, Not CNG Output

## Rule

`npx expo prebuild` regenerates the `android/` directory from scratch every run in CNG (Continuous Native Generation) projects. Gradle cache keys based on file hashes of `android/` contents will never hit.

## Why

The entire `android/` directory is gitignored and rebuilt by `expo prebuild`. Even with identical source code, the regenerated files have different timestamps and sometimes different content (generated comments, version stamps). Cache keys like `hashFiles('android/build.gradle.kts')` change every run.

## Bad

```yaml
- uses: actions/cache@v4
  with:
    key: gradle-${{ hashFiles('android/build.gradle.kts', 'android/gradle/wrapper/gradle-wrapper.properties') }}
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
```

## Good

```yaml
# Cache based on source files that GENERATE the android directory
- uses: actions/cache@v4
  with:
    key: gradle-${{ hashFiles('app.json', 'package.json', 'pnpm-lock.yaml') }}
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
```

Or accept cold builds and set generous timeouts instead.

## Origin

TwinMind brownfield CI — Android builds timed out at 45 min because Gradle cache never hit despite being configured.

## Verify

When Gradle cache never hits in a CNG project: check if the cache key is based on files in the `android/` directory. If `expo prebuild` regenerates android/ from scratch, cache keys must hash source files (app.json, package.json), not generated output.

## Patterns

### Pattern (bad)

```yaml
# Hashing generated files that change every prebuild
- uses: actions/cache@v4
  with:
    key: gradle-${{ hashFiles('android/build.gradle.kts', 'android/gradle/wrapper/gradle-wrapper.properties') }}
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
```

### Pattern (good)

```yaml
# Cache based on source files that generate the android directory
- uses: actions/cache@v4
  with:
    key: gradle-${{ hashFiles('app.json', 'package.json', 'pnpm-lock.yaml') }}
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
```
