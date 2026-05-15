---
# pawrrtal-xo1k
title: Stabilize onboarding flow and block chat until workspace bootstrap is valid
status: in-progress
type: feature
priority: normal
created_at: 2026-05-15T05:21:57Z
updated_at: 2026-05-15T05:25:06Z
---

Implement deterministic onboarding bootstrap: separate server config and onboarding-v2 gating, and block chat send when workspace is not ready.

\n## Implementation Plan\n- [ ] Wire unified onboarding readiness source into app layout bootstrap path.\n- [ ] Gate chat send with readiness and surface composer safeguards.\n- [ ] Ensure server-selector and onboarding-v2 open deterministically based on backend/workspace state.\n- [ ] Keep local cache as secondary and finalize remaining compile paths.
