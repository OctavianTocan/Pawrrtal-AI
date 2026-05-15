---
# pawrrtal-t3mr
title: Stabilize onboarding flow and block chat without workspace
status: completed
type: task
priority: normal
created_at: 2026-05-15T05:20:14Z
updated_at: 2026-05-15T05:46:19Z
---

Gate onboarding-v2/server onboarding deterministically and block chat send until workspace/default ready


## Summary of Changes

- Prevented users from seeing the main app shell (sidebar + chat area) when backend configuration or workspace readiness is missing by gating rendering in `AppLayout` on `useOnboardingReadiness()`.
- Dispatched onboarding events from `AppLayout` effects once readiness state is known so backend-server or onboarding-v2 flow opens deterministically.
- Made `OnboardingFlow` non-dismissable for mandatory bootstrap: removed the dialog close affordance and prevented `onOpenChange` from closing the flow unless the flow explicitly closes it.


## Follow-up
- Made StepServer strictly mandatory: removed the `Skip for now` control so users cannot bypass backend selection when backend onboarding is active.
- Updated StepServer unit test to assert skip control is absent in this path.
