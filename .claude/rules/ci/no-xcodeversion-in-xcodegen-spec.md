---
name: no-xcodeversion-in-xcodegen-spec
paths: [".github/workflows/*.{yml,yaml}", "Dockerfile", "**/*.sh"]
---

# Do Not Set XcodeVersion in XcodeGen Spec - It Conflicts with CI Xcode Selection

Category: ci
Tags: [ci, ios, xcodegen, xcode]

## Rule

Never set `xcodeVersion` in XcodeGen project.yml — let the runner's installed Xcode decide platform support.

## Why

Setting `xcodeVersion: "16.4"` on a runner with Xcode 26.4 causes "Supported platforms for the buildables in the current scheme is empty." The build appears to succeed (logs show compilation) but no `.app` is produced. Omitting the field entirely lets the runner's Xcode version determine platform support automatically.

## Examples

### Bad

```yaml
# project.yml — causes silent failure when Xcode version differs
options:
  xcodeVersion: "16.4"
```

### Good

```yaml
# project.yml — no xcodeVersion, works on any Xcode
options:
  bundleIdPrefix: ai.twinmind
  deploymentTarget:
    iOS: "17.0"
```

## References

- brownfield-native-test-hosts skill: iOS CI pitfall #2
- Discovered in CI run where build produced no .app output

## Verify

"Is `xcodeVersion` absent from the XcodeGen project.yml? Does the build produce a `.app` bundle?"

## Patterns

Bad — pinning Xcode version in XcodeGen spec:

```yaml
# project.yml
options:
  xcodeVersion: "16.4"
  # On a runner with Xcode 26.4 → "Supported platforms is empty"
  # Build logs show compilation but no .app is produced
```

Good — let the runner's Xcode determine support:

```yaml
# project.yml
options:
  bundleIdPrefix: com.example
  deploymentTarget:
    iOS: "17.0"
  # No xcodeVersion field — works on any Xcode that supports iOS 17.0+
```
