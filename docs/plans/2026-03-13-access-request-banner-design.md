# Access Request Notification Banner - Design

## Overview

A collapsible notification banner that shows users requesting access. Collapsed state shows an avatar group, summary text, expand chevron, and dismiss button. Expanded state reveals a list of individual users with approve/reject pill toggles.

## Component Structure

```text
AccessRequestBanner (main wrapper)
  CollapsedBar (always visible)
    AvatarGroup (left) - stacked user avatars, max 3 shown
    Text (middle) - "@octavian and 4 others are requesting access"
    ChevronDown (clickable) - rotates 180 when expanded
    X button (right) - dismisses the whole banner
  ExpandedList (collapsible, animated height)
    AccessRequestRow (per user, staggered entry)
      Avatar + Name (left)
      DecisionPill (right) - "Approve" | "Reject" toggle
```

## Props

```ts
type AccessRequest = {
  id: string
  name: string
  avatarUrl?: string
}

type AccessRequestBannerProps = {
  requests: AccessRequest[]
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onDismiss?: () => void
}
```

## DecisionPill States

- **Undecided**: Two buttons in a pill - "Approve" and "Reject", neutral/outline
- **Approved**: Green, checkmark + "Approved", bounce on transition
- **Rejected**: Red/destructive, X + "Rejected", bounce on transition
- **Reversible**: Clicking a decided pill resets to undecided

## Text Logic

- 1 user: "@name is requesting access"
- 2 users: "@name1 and @name2 are requesting access"
- 3+ users: "@name1 and N others are requesting access"

## Animations (Motion, bouncy springs)

| Animation | Trigger | Spec |
|---|---|---|
| Chevron rotation | Expand/collapse | rotate 180, spring stiffness:300 damping:15 |
| Expanded section | Open/close | AnimatePresence + height auto, spring stiffness:250 damping:20 |
| List item stagger | Section opens | y:-8 opacity:0 to y:0 opacity:1, stagger 0.05s |
| DecisionPill bounce | Approve/Reject click | scale [1, 1.1, 1] with spring |

## Existing Components Used

- Avatar, AvatarGroup, AvatarFallback from @/components/ui/avatar
- cn() from @/lib/utils
- Tabler icons: IconChevronDown, IconX, IconCheck

## Files

- `frontend/components/access-request-banner.tsx` - component
- `frontend/app/dev/access-requests/page.tsx` - dev test route
