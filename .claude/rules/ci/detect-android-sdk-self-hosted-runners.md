---
name: detect-android-sdk-self-hosted-runners
paths: [".github/workflows/*.{yml,yaml}", "Dockerfile", "**/*.sh"]
---

# Detect Android SDK Path Dynamically on Self-Hosted Runners

Category: ci
Tags: [ci, android, self-hosted, github-actions]

## Rule

Auto-detect ANDROID_HOME on self-hosted runners by probing known paths — do not assume it's set in the environment.

## Why

Self-hosted macOS runners often don't have `ANDROID_HOME` set even when Android SDK is installed. Gradle fails with "SDK location not found" during both AAR and APK builds. The SDK is usually at `~/Library/Android/sdk` but could be at several other locations.

## Examples

### Bad

```yaml
# Assumes ANDROID_HOME exists — fails on self-hosted
- name: Build AAR
  run: cd android && ./gradlew assembleRelease
```

### Good

```yaml
- name: Detect Android SDK
  run: |
    for dir in \
      "$HOME/Library/Android/sdk" \
      "/opt/homebrew/share/android-commandlinetools" \
      "/usr/local/share/android-commandlinetools"; do
      if [ -d "$dir/platforms" ]; then
        echo "ANDROID_HOME=$dir" >> "$GITHUB_ENV"
        break
      fi
    done
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

## References

- Maestro E2E mobile skill: Android CI ANDROID_HOME auto-detection
- brownfield-native-test-hosts skill: ANDROID_HOME not set on Mac Mini

## Verify

"Does the workflow probe multiple known ANDROID_HOME paths? Is `local.properties` generated before the Gradle build? Will the build work on a runner without ANDROID_HOME in the environment?"

## Patterns

Bad — assume ANDROID_HOME is set:

```yaml
- name: Build AAR
  run: cd android && ./gradlew assembleRelease
# Fails: "SDK location not found. Define a valid SDK location with
# an ANDROID_HOME environment variable or by setting the sdk.dir path
# in your project's local properties file"
```

Good — probe known paths and generate local.properties:

```yaml
- name: Detect Android SDK
  run: |
    for dir in \
      "$HOME/Library/Android/sdk" \
      "/opt/homebrew/share/android-commandlinetools" \
      "/usr/local/share/android-commandlinetools"; do
      if [ -d "$dir/platforms" ]; then
        echo "ANDROID_HOME=$dir" >> "$GITHUB_ENV"
        break
      fi
    done
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties

- name: Build AAR
  run: cd android && ./gradlew assembleRelease
```
