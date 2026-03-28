# Craft Sidebar Migration — Next Steps Plan

## Goal
Continue the Craft Agents migration in **tiny, review-friendly PRs** that keep scope narrow and visual diffs easy to understand.

## Working Rules
- Prefer **small, isolated frontend-only PRs**.
- Stay on one surface area until it feels coherent.
- Avoid bundling behavior, data-flow, and styling changes together unless necessary.
- For ACP coding/planning runs, explicitly use **`openai-codex/gpt-5.4` with `xhigh` thinking** unless we decide otherwise.
- Human review happens after each slice; do not assume a long stacked migration branch is the default.

## Current State
Recently completed sidebar/theme work includes:
- Craft-style theme/token foundation
- Craft-style top bar button
- Craft-style conversation sidebar rows
- Craft-style chats section header

This gives us a solid sidebar visual base to keep iterating on.

## Plan of Attack

### Phase 1 — Finish the Sidebar Surface
Focus on the sidebar until it feels visually coherent.

#### 1. New Conversation button
**Why next:**
- highly visible
- still sidebar-local
- likely styling-first
- easy to review as a standalone PR

**Target outcome:**
- button treatment matches the newer Craft-inspired sidebar language
- no backend or routing changes beyond existing behavior

#### 2. Sidebar spacing / rhythm polish
**Possible scope:**
- spacing between section header and conversation rows
- vertical rhythm around separators
- sidebar content padding and grouping

**Why:**
- useful if the sidebar looks close but still slightly off after the previous PRs
- remains low-risk and visual-only

#### 3. Sidebar empty state
**Why:**
- self-contained
- improves UX for new/empty accounts
- good presentational follow-up before touching the chat panel

**Target outcome:**
- empty sidebar/chat-list area feels intentional and consistent with Craft

#### 4. Row interaction polish (only if needed)
**Possible scope:**
- hover/selected contrast
- keyboard focus styling
- timestamp alignment/overflow edge cases

**Why:**
- only worth doing if review feedback or visual inspection says current rows need refinement

### Phase 2 — Move Inward to the Main Panel
Once the sidebar feels coherent, start on the least risky main-panel surfaces.

#### 5. Chat empty state / welcome state
**Why first:**
- mostly presentational
- easier than message rendering or composer work
- visible win without dragging in streaming logic

#### 6. Main panel chrome / lightweight layout polish
**Possible scope:**
- headers
- framing containers
- subtle spacing and token alignment

**Why:**
- helps bridge the visual language from sidebar to content area

### Phase 3 — Higher-Risk Surfaces (Do Later)
These should only happen after the low-risk presentational layers are in place.

#### 7. Message cards / message presentation
**Risks:**
- content rendering differences
- tool/result states
- assistant/user role styling
- streaming edge cases

#### 8. Input composer
**Risks:**
- autosize
- keyboard behavior
- attachments
- submit/disabled/loading states

#### 9. Model selector
**Risks:**
- state wiring
- interaction complexity
- command/dialog behavior

## Recommended Immediate Next Step
Create a **small planning/research pass** for the next PR focused on:

> **Port the Craft-style New Conversation button**

That pass should answer:
- exact Craft source reference
- exact local files to change
- whether this should be a local override or shared primitive
- risk of accidental layout/behavior changes
- smallest reviewable implementation path

## PR Sequencing Recommendation
1. Theme/tokens + sidebar rows + section header ✅
2. New Conversation button
3. Sidebar spacing/polish
4. Sidebar empty state
5. Main-panel empty state
6. Main-panel chrome polish
7. Message cards
8. Composer
9. Model selector

## Anti-Goals
For the next few PRs, avoid:
- backend changes
- API contract changes
- broad routing changes
- mixing multiple UI surfaces into one PR
- turning a visual PR into a behavior/refactor swamp

## Success Criteria
This plan is working if:
- each PR has a clear single-surface story
- diffs stay easy to review
- visual progress is obvious after each merge
- we avoid giant tangled migration branches
