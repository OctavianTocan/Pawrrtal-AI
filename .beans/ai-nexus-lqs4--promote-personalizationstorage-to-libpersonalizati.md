---
# ai-nexus-lqs4
title: Promote personalization/storage to lib/personalization/
status: todo
type: task
priority: high
tags:
    - sentrux
    - modularity
    - refactor
created_at: 2026-05-06T16:51:10Z
updated_at: 2026-05-06T16:51:10Z
parent: ai-nexus-ey9p
---

## Why

Sentrux health (May 6, 2026) shows **modularity is now the bottleneck** (raw 0.32, score 5468; quality_signal 6882). The single largest concentrated source of cross-feature edges is `frontend/features/personalization/storage` and the related `hooks/use-personalization`, which behave as shared persistence/types but live inside a feature.

## Cross-feature importers (7 edges)

- `frontend/features/onboarding/v2/step-identity.tsx` → `@/features/personalization/storage`
- `frontend/features/onboarding/v2/step-messaging.tsx` → `@/features/personalization/storage`
- `frontend/features/onboarding/v2/step-personality.tsx` → `@/features/personalization/storage`
- `frontend/features/onboarding/v2/step-personality.test.tsx` → `@/features/personalization/storage`
- `frontend/features/onboarding/v2/step-context.tsx` → `@/features/personalization/storage`
- `frontend/features/onboarding/v2/OnboardingFlow.tsx` → `@/features/personalization/storage` and `hooks/use-personalization`
- `frontend/features/settings/sections/PersonalizationSection.tsx` → `@/features/personalization/storage`

## Plan

- [ ] Move `frontend/features/personalization/storage.ts` (+ types) → `frontend/lib/personalization/storage.ts`
- [ ] Move `frontend/features/personalization/hooks/use-personalization.ts` → `frontend/lib/personalization/use-personalization.ts`
- [ ] Update all importers above
- [ ] Keep onboarding/settings UI under `features/`; only the data layer moves
- [ ] Verify no `from "@/features/personalization/...` imports remain
- [ ] Re-run `just sentrux`; record before/after quality_signal
- [ ] `just check`, `bun run typecheck`, `bun run test`

## Expected impact

Removes ~7 cross-module edges of 583, and (more importantly) demotes the most concentrated single source of feature-to-feature pull. Equality should also tick up since `storage` will no longer be a high-fan-in node inside a feature.

## Notes

- Per the no-backwards-compat rule, do not leave a re-export shim at the old path; update all consumers.
- This sits at frontend layer `lib`, the lowest layer in `.sentrux/rules.toml` (`app → features → ai-elements → ui-primitives → lib`), so all current importers remain rule-compliant.
