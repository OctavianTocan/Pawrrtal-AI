---
name: plistbuddy-secrets-after-build
paths: ["**/*.{ts,tsx,kt,swift,gradle,xml}", "**/Podfile", "**/*.xcconfig"]
---

# Use PlistBuddy to Inject Secrets Into Info.plist After xcodebuild, Not Via Build Settings

Use PlistBuddy to inject secrets into the built Info.plist after xcodebuild — never rely solely on build-setting expansion in xcodegen-generated projects.

xcodegen-generated projects have three failure modes for `$(VAR)` expansion: circular self-references (`AUTH0_DOMAIN: "$(AUTH0_DOMAIN)"`), missing declarations, and CLI overrides being shadowed. PlistBuddy post-build injection bypasses the entire build-setting expansion mechanism and writes values directly. This was proven across 14 CI iterations as the only deterministic approach.

## Verify

"Am I relying on build-setting expansion for secrets? Should I use PlistBuddy post-build injection instead?"

## Patterns

Bad — circular self-reference in build settings, resolves to empty:

```yaml
# project.yml — circular self-reference, resolves to empty
settings:
  base:
    AUTH0_DOMAIN: "$(AUTH0_DOMAIN)"
```

Good — post-build injection via PlistBuddy:

```bash
# Post-build injection via PlistBuddy (after xcodebuild, before app install)
PLIST="$APP_PATH/Info.plist"
for KEY in AUTH0_DOMAIN AUTH0_CLIENT_ID AUTH0_CLIENT_SECRET; do
  VAL="${!KEY:-}"
  /usr/libexec/PlistBuddy -c "Set :$KEY $VAL" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :$KEY string $VAL" "$PLIST"
done
```

Proven across 14 CI iterations as the only deterministic approach for xcodegen-generated projects.
