---
# pawrrtal-xtxb
title: Code signing + notarization for Electron macOS builds
status: todo
type: task
priority: normal
created_at: 2026-05-05T06:09:27Z
updated_at: 2026-05-05T06:09:27Z
---

\`electron/package.json\` ships with code signing intentionally disabled (\`hardenedRuntime: false\`, \`gatekeeperAssess: false\`). Required before any public release because:
- Auto-updates won't apply on recent macOS without a valid signature.
- Gatekeeper blocks unsigned apps with the "cannot verify the developer" prompt.

**What's needed.**
- Apple Developer account + Developer ID Application certificate (\`CSC_LINK\` + \`CSC_KEY_PASSWORD\` env vars).
- Notarization credentials: \`APPLE_ID\`, \`APPLE_APP_SPECIFIC_PASSWORD\`, \`APPLE_TEAM_ID\` env vars.
- Flip \`hardenedRuntime: true\` and \`gatekeeperAssess: true\` in \`electron/package.json\` build config.
- Add the entitlements file \`electron/build/entitlements.mac.plist\` (allow JIT, allow unsigned executable memory if needed for Node).
- CI: secrets in GitHub Actions; macOS runner; \`electron-builder\` calls notarytool automatically when notarize creds are present.

## Todo
- [ ] Acquire Developer ID Application certificate
- [ ] Add CSC_* env to local .env (gitignored)
- [ ] Add APPLE_* notarization env
- [ ] Write electron/build/entitlements.mac.plist
- [ ] Flip hardenedRuntime + gatekeeperAssess in package.json
- [ ] Add CI secrets + macOS runner
- [ ] Smoke test: signed DMG opens without "cannot verify" prompt
