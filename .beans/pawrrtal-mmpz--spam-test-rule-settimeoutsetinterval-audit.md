---
# pawrrtal-mmpz
title: Spam-test rule + setTimeout/setInterval audit
status: completed
type: task
priority: normal
created_at: 2026-05-07T09:32:27Z
updated_at: 2026-05-07T09:57:27Z
---

Forward-looking project rule: 'Your UI is only as polished as its worst spam test.' Plus an audit of existing timer-based state flips to ensure none would break under spam.

## D1: Rule

Create `.claude/rules/react/clear-timeouts-on-spam.md` (Claude rule) — content:

> # Clear Timers Before Re-Triggering State Flips
>
> Buttons that flash a state then revert (copy → checkmark → unmount, save → toast → fade, error → shake → reset) MUST store their timeout in a ref and clear it before scheduling a new one. Spam-clicking these without ref-cleanup causes:
> - Old timeouts firing mid-animation, yanking visual state away unexpectedly
> - State desync (e.g. checkmark appearing on a button that's no longer in success mode)
> - Memory leaks from accumulated timers
>
> ## Verify
> 'Does this component flash a state then revert via setTimeout? Is the timeout stored in a useRef? Is the previous timeout cleared before scheduling a new one?'
>
> ## Pattern
>
> Bad — timeout not cleared on rerun:
> ```tsx
> function CopyButton() {
>   const [copied, setCopied] = useState(false);
>   return <button onClick={() => {
>     setCopied(true);
>     setTimeout(() => setCopied(false), 2000); // leaked
>   }}>{copied ? <Check /> : <Copy />}</button>;
> }
> ```
>
> Good — ref-stored, cleared on each click:
> ```tsx
> function CopyButton() {
>   const [copied, setCopied] = useState(false);
>   const timerRef = useRef<ReturnType<typeof setTimeout>>();
>   useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
>   return <button onClick={() => {
>     if (timerRef.current) clearTimeout(timerRef.current);
>     setCopied(true);
>     timerRef.current = setTimeout(() => setCopied(false), 2000);
>   }}>{copied ? <Check /> : <Copy />}</button>;
> }
> ```

## D2: Audit

Sweep `frontend/` for:

- `setTimeout` / `setInterval` not stored in a ref
- `setTimeout` not cleared in a cleanup function
- Components with state-flip-with-timer patterns (search/find/error toast, etc.)

Existing animation inventory found one timer (`agent-spinner.tsx` — clean). Likely 2-5 more across the codebase. Each gets the ref + cleanup pattern.

## Tasks

- [ ] Write rule at `.claude/rules/react/clear-timeouts-on-spam.md`
- [ ] Grep `frontend/` for `setTimeout|setInterval` usage
- [ ] Audit each: is timer ref-stored? Cleared on cleanup? Cleared before re-trigger?
- [ ] Patch any unsafe patterns (expect 2-5 fixes)
- [ ] Add a brief mention in CLAUDE.md or AGENTS.md so future agents see the rule
- [ ] Optionally: add a Biome lint rule for setTimeout-without-ref-pattern (research feasibility)



## Progress

- [x] Rule file written at `.claude/rules/react/clear-timers-on-spam.md` — covers the spam-test mindset, bad/good copy-button patterns, the reusable `useFlashState` hook recipe, and the same logic applied to setInterval and requestAnimationFrame.

## Remaining

- [ ] Sweep `frontend/` for setTimeout / setInterval / requestAnimationFrame and audit each call site for ref-storage + cleanup-on-unmount + clear-on-rerun
- [ ] Patch any unsafe patterns (animation-inventory found agent-spinner is clean; expecting 2-5 more across the codebase)
- [ ] Add brief mention in CLAUDE.md or AGENTS.md so future agents see the rule



## Audit results

Swept frontend/ for setTimeout / setInterval / requestAnimationFrame outside of test/storybook scopes.

**Found 1 spam-vulnerable site:**

- `components/ai-elements/code-block.tsx:163` — `CodeBlockCopyButton` had a bare `setTimeout(() => setIsCopied(false), timeout)` without ref storage. Spamming the copy button would schedule N concurrent revert calls, causing icon flicker. **FIXED** with ref + cleanup pattern from the rule.

**Already safe (verified):**

- `hooks/use-tooltip-dropdown.ts` — `closingTimerRef`, clears before re-scheduling
- `features/chat/hooks/use-copy-to-clipboard.ts` — exemplar pattern, ref + cleanup-on-unmount
- `components/ui/agent-spinner.tsx` — interval ref, cleanup on unmount
- `features/chat/components/ChatComposer.tsx` — placeholder rotator + recording timer, both useEffect with proper cleanup
- `features/chat/components/ThinkingHeader.tsx` — animated dots interval, useEffect cleanup
- `components/ai-elements/reasoning.tsx` — auto-close timer in useEffect, returns clearTimeout
- `features/settings/sections/AppearanceRows.tsx` — debounce pattern in useEffect, cleanup on dep change. RAF picker is ref-stored + cancelled-before-rerun
- `features/onboarding/OnboardingBackdrop.tsx` — RAF in closure, cancelled in cleanup
- `features/nav-chats/hooks/use-export-conversation.ts` — fire-and-forget URL.revokeObjectURL with no state implications
- `components/app-layout.tsx:414` — sidebar transition uses RAF + setTimeout. Timeout IS ref-stored and cleared-before-rescheduling. RAF is fire-and-forget but inner setTimeout setState would warn on unmount; minor edge case, not patched
- `lib/react-dropdown/src/useMenuKeyboard.ts` — type-ahead buffer timer ref, clears before re-schedule
- `lib/react-dropdown/src/DropdownSubmenu.tsx` — single shared timer ref, clears before re-schedule + on unmount
- `lib/react-dropdown/src/DropdownRoot.tsx` — `useAnimationStateTracker` setTimeout in useEffect with cleanup
- `lib/react-dropdown/src/DropdownContent.tsx` — collision-reposition rAF stored in handle var, cancelled in cleanup

The codebase is largely well-defended against spam. The one fix in code-block.tsx was the only real issue.

## Verified

- `tsc --noEmit` clean
- 130/130 package tests pass
