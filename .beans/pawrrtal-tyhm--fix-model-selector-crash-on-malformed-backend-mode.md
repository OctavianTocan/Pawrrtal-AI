---
# pawrrtal-tyhm
title: Fix model selector crash on malformed backend model payload
status: in-progress
type: bug
created_at: 2026-05-15T06:09:00Z
updated_at: 2026-05-15T06:09:00Z
---

Model selector crashes with  because catalog entries can include missing/invalid vendor fields; guard catalog parsing and rendering so malformed rows are filtered with telemetry and user-facing error.
