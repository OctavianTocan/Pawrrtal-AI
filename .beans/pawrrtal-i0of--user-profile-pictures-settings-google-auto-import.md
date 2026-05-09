---
# pawrrtal-i0of
title: User profile pictures (settings + Google auto-import)
status: todo
type: feature
priority: normal
created_at: 2026-05-07T16:20:39Z
updated_at: 2026-05-07T16:20:39Z
---

## Goal

Users can have a profile picture rendered next to their name in the user dropdown, conversation list (when shown), and Settings → General. Two ways to populate it:

1. **Manual upload** in Settings → General → Profile. Crop to square, resize/optimise, upload to backend storage.
2. **Auto-import on Google OAuth login** — Google's userinfo response includes a ``picture`` field; on first sign-in, fetch and store it as the user's avatar.

## Backend

- DB: add ``avatar_path`` (or ``avatar_url``) to ``User`` (or a sibling ``UserProfile`` table — the existing ``UserPersonalization`` is conceptually different, lean toward extending ``User`` directly).
- Storage: filesystem under ``WORKSPACE_BASE_DIR`` won't do — avatars are a different lifecycle. Use a separate ``AVATAR_DIR`` config or push to S3-compatible object storage. Phase 1: local filesystem with a ``GET /api/v1/avatars/<user_id>.png`` route.
- Endpoints:
  - ``PUT /api/v1/user/avatar`` — multipart upload, validates MIME, resizes via Pillow, stores.
  - ``DELETE /api/v1/user/avatar`` — removes the file + clears the field.
  - ``GET /api/v1/user/avatar`` — redirects/streams the bytes (or include the URL in ``GET /api/v1/user/me``).
- Migration: add the new column.
- Google OAuth callback (``app/api/oauth.py``): if ``userinfo.picture`` and the user has no ``avatar_path``, download it once and persist.

## Frontend

- Settings → General → Profile section gets an avatar widget: shows current avatar (or an initial-letter placeholder), with Upload and Remove buttons.
- User dropdown menu in the sidebar uses the same avatar.
- Image is fetched via the new endpoint, cached client-side.

## Validation

- File size cap (e.g. 5 MB).
- MIME types allowed: ``image/png``, ``image/jpeg``, ``image/webp``.
- Server-side resize to a max edge (e.g. 512px) before persisting; emit 256×256 and 64×64 derivatives.
- Strip EXIF (privacy + size).

## Acceptance

- Logged-in user uploads an avatar; it shows up in user dropdown + Settings.
- New Google OAuth signup auto-populates the avatar from Google's profile.
- Removing the avatar reverts to the initial-letter placeholder.
- Server validates size/MIME; bad upload returns clear error.
- Tests cover the upload + Google auto-import path.

## Todos

- [ ] DB migration for ``avatar_path``
- [ ] Pillow resize util + storage adapter (filesystem first)
- [ ] PUT/DELETE/GET avatar routes
- [ ] Hook Google OAuth callback into auto-import
- [ ] Frontend Settings widget (upload + remove + crop UI)
- [ ] User dropdown avatar
- [ ] Initial-letter placeholder component
- [ ] Tests covering upload, deletion, Google auto-import

## Related

- Coordinates with the primitive components epic (pawrrtal-kds0) — the avatar widget itself is a primitive worth landing through that lens.
