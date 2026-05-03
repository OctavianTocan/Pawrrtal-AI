---
name: xcodegen-empty-default-settings
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# XcodeGen Empty Default Build Settings Prevent Overriding Host App Config

Declare custom build settings with empty-string defaults in xcodegen's project.yml. Never use self-referencing `$(VAR)` syntax.

`AUTH0_DOMAIN: "$(AUTH0_DOMAIN)"` in project.yml creates a circular reference: the build setting is defined as itself, resolving to empty. xcodebuild CLI overrides have highest precedence, but the circular project-level definition can shadow them depending on xcodegen's generated pbxproj structure. Empty-string defaults (`AUTH0_DOMAIN: ""`) let xcodebuild CLI overrides work cleanly.

## Verify

"Does my project.yml use $(VAR) self-references for build settings? Should I use empty-string defaults instead?"

## Patterns

Bad — circular self-reference, resolves to empty:

```yaml
# project.yml — circular self-reference, resolves to empty
settings:
  base:
    AUTH0_DOMAIN: "$(AUTH0_DOMAIN)"
```

Good — empty default, CLI overrides cleanly:

```yaml
# project.yml — empty default, CLI overrides cleanly
settings:
  base:
    AUTH0_DOMAIN: ""
```

TwinMind E2E: circular reference in project.yml caused iOS auth to fail for 5+ runs.
