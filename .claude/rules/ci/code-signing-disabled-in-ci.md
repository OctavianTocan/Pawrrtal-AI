---
name: code-signing-disabled-in-ci
paths: [".github/workflows/*.{yml,yaml}", "Dockerfile", "**/*.sh"]
---

# Disable Code Signing in CI

CI builds that don't produce distributable artifacts must set `CODE_SIGNING_ALLOWED=NO`. The brownfield CLI and xcodebuild both require this when no development team is configured.

## Rule

Add `--extra-params "CODE_SIGNING_ALLOWED=NO"` to brownfield CLI commands, or pass it as an xcodebuild argument. Without it, Xcode fails with "Signing requires a development team" even for framework/library builds that don't need signing.

## Why

Self-hosted Mac Mini runners and GitHub-hosted macOS runners don't have Apple developer certificates installed by default. Framework builds (XCFramework, static libraries) don't need code signing, but Xcode demands it unless explicitly told not to.

## Verify

"Does every xcodebuild or brownfield CLI step in CI include `CODE_SIGNING_ALLOWED=NO` for builds that don't produce distributable artifacts?"

## Patterns

Bad — code signing required but no certificate available:

```yaml
# Fails: "Signing requires a development team"
- name: Build iOS framework
  run: |
    npx react-native-brownfield build ios --scheme BrownfieldLib
  # Xcode demands signing even for framework-only builds

# Or with raw xcodebuild:
- run: xcodebuild -workspace App.xcworkspace -scheme App
  # Error: Signing certificate not found
```

Good — explicitly disable signing for CI builds:

```yaml
# Brownfield CLI
- name: Build iOS framework
  run: |
    npx react-native-brownfield build ios \
      --scheme BrownfieldLib \
      --extra-params "CODE_SIGNING_ALLOWED=NO"

# Raw xcodebuild
- name: Build framework
  run: |
    xcodebuild build \
      -workspace App.xcworkspace \
      -scheme BrownfieldLib \
      CODE_SIGNING_ALLOWED=NO
```

Good — only enable signing when distributing:

```yaml
# CI test builds: no signing
- name: Build for testing
  run: xcodebuild build-for-testing CODE_SIGNING_ALLOWED=NO

# Release builds only: enable signing with stored certificate
- name: Build for distribution
  if: github.ref == 'refs/heads/main'
  run: xcodebuild archive -scheme App -archivePath build/App.xcarchive
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
