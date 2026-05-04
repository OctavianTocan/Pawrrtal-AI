---
name: expo-cng-gradle-env-vars
paths: ["**/*.{ts,tsx,kt,java,swift}"]
---

# Expo CNG: Gradle Config via Environment Variables

Expo Continuous Native Generation (CNG) projects gitignore the `android/` directory, so `gradle.properties` can't be committed. Configure Gradle memory via environment variables instead.

## Rule

```yaml
env:
  GRADLE_OPTS: '-Dorg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g'
```

Set this in CI workflow environment, not in a file. The 4GB heap + 1GB metaspace prevents OOM on the 7GB ubuntu-latest runner during AAR builds.

## Why

Default Gradle heap (512MB) causes OOM during React Native Android builds with native dependencies. Normally you'd set this in `gradle.properties`, but CNG regenerates the `android/` directory on every `npx expo prebuild`, so the file doesn't persist.

## Verify

"Is Gradle memory configured via environment variables (not `gradle.properties`)? Does the CI workflow set `GRADLE_OPTS` with sufficient heap and metaspace?"

## Patterns

Bad — editing `gradle.properties` in a CNG project:

```properties
# android/gradle.properties — gets wiped on every `npx expo prebuild`
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g
```

Good — setting environment variables in CI:

```yaml
# .github/workflows/build.yml
jobs:
  android:
    runs-on: ubuntu-latest
    env:
      GRADLE_OPTS: '-Dorg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g'
    steps:
      - run: npx expo prebuild
      - run: cd android && ./gradlew assembleRelease
```
