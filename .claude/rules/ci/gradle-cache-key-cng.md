---
name: gradle-cache-key-cng
paths: [".github/workflows/*.{yml,yaml}", "Dockerfile", "**/*.sh"]
---

# Hash source files for Gradle cache keys, not CNG-generated output

## Explanation

Expo's Continuous Native Generation (CNG) regenerates `android/` from scratch on every `expo prebuild` run. Hashing `android/**/*.gradle*` for the cache key produces a different hash each time, so the Gradle cache never hits. Hash the source files that determine what gets generated: `app.json`, `package.json`, and `pnpm-lock.yaml`.

## Verify

Does the Gradle cache key hash stable source files rather than generated output?

## Patterns

Bad — hash CNG-generated files:

```yaml
key: gradle-${{ hashFiles('react-native/android/**/*.gradle*') }}
# Different key every run because expo prebuild regenerates android/
```

Good — hash stable source files:

```yaml
key: gradle-${{ hashFiles('react-native/app.json', 'react-native/package.json', 'react-native/pnpm-lock.yaml') }}
# Stable key — only changes when deps or config actually change
```
