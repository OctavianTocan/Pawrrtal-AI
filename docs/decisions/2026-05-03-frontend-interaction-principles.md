# Frontend Interaction Principles From Recent Fixes

Date: 2026-05-03

Status: Accepted

Related bean: `pawrrtal-w4ft`

## Context

Recent onboarding, sidebar, chat title, and app chrome fixes exposed a set of
repeatable failure modes in dense application UI:

- persistent navigation text reanimated when unrelated list groups collapsed;
- sidebar resizing ignored the first drag because live drag state fed back into
  a panel registration prop;
- chat rows stopped navigating because modifier-key mouse handling replaced the
  primary click behavior;
- generated titles could persist provider error text instead of useful user
  context;
- light mode and pointer affordances broke where components bypassed shared
  design tokens and primitives.

These are not one-off bugs. They are design and implementation principles we
should apply to future frontend work in this repository.

## Decision

Use the following principles for Pawrrtal app chrome, navigation, onboarding,
and other dense work surfaces.

1. Persistent navigation text should be stable by default.
   Avoid per-letter or layout-aware animation for sidebar/session list titles.
   Reserve title animation for explicit title-generation transitions, not for
   always-visible navigation labels.

2. Keep registration and default props stable after mount.
   Props such as `defaultSize`, constraints, IDs, keys, and registration inputs
   should not be driven by live drag or interaction state. Feed live values to
   callbacks and persistence, not back into mount-time configuration.

3. Separate initial values from current values.
   Hydrated persisted values are initial conditions. Once a component is
   interactive, keep the initial/default value separate from current runtime
   state.

4. Compose secondary interaction handlers with primary behavior.
   `onMouseDown` for modifier tracking, focus, or selection should not suppress
   `onClick` navigation unless that is the explicit interaction contract.

5. Optimistic UI should use the user's truth first.
   For conversation metadata, show the user's first message immediately when it
   is the best available label. AI-generated metadata can refine it later.

6. Treat AI-generated metadata as untrusted input.
   Reject empty, overlong, or provider/error-looking generated titles before
   persisting them.

7. Design tokens should own theme contrast.
   Use tokens such as `background`, `foreground`, `muted-foreground`, `border`,
   and shared shadow/radius utilities instead of dark-mode-specific assumptions.

8. Put common interaction affordances in primitives.
   Cursor and hover affordances belong in shared primitives like `Button`,
   top-bar buttons, sidebar menu buttons, and row components.

9. Avoid layout animation in dense chrome unless the layout itself is the object
   being animated.
   Prefer local opacity, color, or non-layout transforms for feedback. Motion
   layout animation can couple unrelated UI changes and replay animations on
   stable content.

10. When the first attempt fails but the second works, inspect lifecycle and
    registration paths first.
    Suspect effects, refs, `default*` props, ResizeObserver, pointer capture,
    stale hit regions, or component remount/re-registration.

## Consequences

- Sidebar and app chrome should feel quieter and more predictable.
- Animation use should be more deliberate and easier to reason about.
- Future interaction bugs should be diagnosed by tracing ownership of state,
  lifecycle, registration, and shared primitives before patching symptoms.
- Components that need richer motion should document why layout animation is
  appropriate and what user action owns that motion.
