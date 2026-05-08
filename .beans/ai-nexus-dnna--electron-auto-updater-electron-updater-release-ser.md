---
# pawrrtal-dnna
title: Electron auto-updater (electron-updater + release server)
status: todo
type: feature
priority: normal
created_at: 2026-05-05T06:09:13Z
updated_at: 2026-05-05T06:09:13Z
---

The desktop shell ships installers via electron-builder but has no auto-update path. Without it every desktop user is permanently on whatever version they first downloaded.

**Scope.**
- Add \`electron-updater\` dependency to \`electron/\`.
- Wire \`autoUpdater.checkForUpdatesAndNotify()\` in \`electron/src/main.ts\` post-bootstrap, gated on \`app.isPackaged\`.
- Choose a release host: GitHub releases (cheap, public) vs S3 + a CloudFront signed URL (private alpha builds). Default to GitHub releases via electron-builder's \`publish: github\` config.
- Surface \`onUpdateAvailable\` + \`onUpdateDownloaded\` events through the existing \`pawrrtal\` IPC bridge so the FE can render an "Update ready — restart now" toast.
- CI: GitHub Actions job that runs \`just electron-dist\`, signs the artifacts, and \`gh release create\` with the matching version. Tag drives the version.

**Risks.**
- macOS code signing is a prerequisite (unsigned auto-updates are silently dropped on recent macOS).
- Need notarization keys in CI secrets.

## Todo
- [ ] Pick release host (recommend GitHub releases)
- [ ] Wire electron-updater in main.ts
- [ ] Add onUpdateAvailable/onUpdateDownloaded to pawrrtal bridge
- [ ] FE toast surfacing the update
- [ ] CI job for signed release builds
- [ ] Document the release flow in electron/README.md
