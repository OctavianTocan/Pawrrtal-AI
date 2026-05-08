# Access Request Banner Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an animated collapsible notification banner showing users requesting access, with per-user approve/reject pill toggles.

**Architecture:** Single "use client" component file with internal sub-components (DecisionPill, AccessRequestRow). State is managed internally via useState for expand/collapse and per-user decisions. All animation via motion/react with bouncy spring configs. Dev route with mock data for testing.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, shadcn/ui (radix-maia style), Motion v12, Tabler Icons, Bun

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend/components/access-request-banner.tsx` | Main component + sub-components (DecisionPill, AccessRequestRow). Exports `AccessRequestBanner` + types. |
| `frontend/app/dev/access-requests/page.tsx` | Dev-only route at `/dev/access-requests` with mock data to test the banner. |

---

## Chunk 1: Access Request Banner Component

### Task 1: Create the types and DecisionPill sub-component

**Files:**
- Create: `frontend/components/access-request-banner.tsx`

- [ ] **Step 1: Create the file with types, imports, and DecisionPill**

Write `frontend/components/access-request-banner.tsx` with:

```tsx
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

/** A single access request entry. */
export type AccessRequest = {
  id: string;
  name: string;
  avatarUrl?: string;
};

/** Decision state for a single access request. */
type Decision = "undecided" | "approved" | "rejected";

/** Spring config reused across all bouncy animations. */
const BOUNCY_SPRING = { type: "spring" as const, stiffness: 300, damping: 15 };

/** Slightly softer spring for the expanding section to feel weighty. */
const EXPAND_SPRING = { type: "spring" as const, stiffness: 250, damping: 20 };

/**
 * Pill toggle for approve/reject decisions.
 *
 * Shows two side-by-side buttons when undecided, collapses to a single
 * status indicator once a decision is made. Clicking a decided pill
 * resets it to undecided (reversible).
 */
function DecisionPill({
  decision,
  onApprove,
  onReject,
  onReset,
}: {
  decision: Decision;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
}) {
  if (decision === "approved") {
    return (
      <motion.button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
        /* Bounce in when transitioning to decided state */
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={BOUNCY_SPRING}
        whileTap={{ scale: 0.95 }}
      >
        <IconCheck className="size-3" />
        Approved
      </motion.button>
    );
  }

  if (decision === "rejected") {
    return (
      <motion.button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={BOUNCY_SPRING}
        whileTap={{ scale: 0.95 }}
      >
        <IconX className="size-3" />
        Rejected
      </motion.button>
    );
  }

  /* Undecided: show both options in a shared pill container */
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-border">
      <motion.button
        type="button"
        onClick={onApprove}
        className="px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
        whileTap={{ scale: 0.95 }}
      >
        Approve
      </motion.button>
      {/* Visual divider between the two options */}
      <div className="h-4 w-px bg-border" />
      <motion.button
        type="button"
        onClick={onReject}
        className="px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        whileTap={{ scale: 0.95 }}
      >
        Reject
      </motion.button>
    </div>
  );
}
```

- [ ] **Step 2: Verify file parses correctly**

Run: `cd frontend && bunx --bun tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to access-request-banner.tsx

---

### Task 2: Add the AccessRequestRow sub-component

**Files:**
- Modify: `frontend/components/access-request-banner.tsx`

- [ ] **Step 1: Add AccessRequestRow below DecisionPill**

Append to the file, before any main component:

```tsx
/**
 * A single row in the expanded access request list.
 *
 * Renders avatar + name on the left, DecisionPill on the right.
 * Designed to be wrapped in a motion.div for staggered entry.
 */
function AccessRequestRow({
  request,
  decision,
  onApprove,
  onReject,
  onReset,
}: {
  request: AccessRequest;
  decision: Decision;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
}) {
  /* Extract initials from name for avatar fallback (first letter of first + last name) */
  const initials = request.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <div className="flex items-center gap-3">
        <Avatar size="sm">
          {request.avatarUrl && <AvatarImage src={request.avatarUrl} alt={request.name} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{request.name}</span>
      </div>
      <DecisionPill
        decision={decision}
        onApprove={onApprove}
        onReject={onReject}
        onReset={onReset}
      />
    </div>
  );
}
```

---

### Task 3: Build the main AccessRequestBanner component

**Files:**
- Modify: `frontend/components/access-request-banner.tsx`

- [ ] **Step 1: Add the summary text helper**

```tsx
/**
 * Builds the summary string for the collapsed banner.
 *
 * Uses the first user's name and counts the rest to keep the
 * collapsed bar scannable at a glance.
 */
function buildSummaryText(requests: AccessRequest[]): string {
  if (requests.length === 0) return "";
  if (requests.length === 1) return `@${requests[0].name} is requesting access`;
  if (requests.length === 2)
    return `@${requests[0].name} and @${requests[1].name} are requesting access`;
  return `@${requests[0].name} and ${requests.length - 1} others are requesting access`;
}
```

- [ ] **Step 2: Add the main component export**

```tsx
/** Props for the {@link AccessRequestBanner} component. */
export type AccessRequestBannerProps = {
  requests: AccessRequest[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDismiss?: () => void;
};

/**
 * Collapsible notification banner for pending access requests.
 *
 * Collapsed state shows an avatar group, summary text, expand chevron,
 * and dismiss button. Expanded state reveals per-user rows with
 * approve/reject pill toggles. All transitions use bouncy spring animations.
 */
export function AccessRequestBanner({
  requests,
  onApprove,
  onReject,
  onDismiss,
}: AccessRequestBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  /* Track decisions locally so the banner can show decided state inline */
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const handleApprove = (id: string) => {
    setDecisions((prev) => ({ ...prev, [id]: "approved" }));
    onApprove?.(id);
  };

  const handleReject = (id: string) => {
    setDecisions((prev) => ({ ...prev, [id]: "rejected" }));
    onReject?.(id);
  };

  const handleReset = (id: string) => {
    setDecisions((prev) => ({ ...prev, [id]: "undecided" }));
  };

  if (requests.length === 0) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Collapsed bar: always visible */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar stack showing up to 3 users */}
        <AvatarGroup>
          {requests.slice(0, 3).map((r) => (
            <Avatar key={r.id} size="sm">
              {r.avatarUrl && <AvatarImage src={r.avatarUrl} alt={r.name} />}
              <AvatarFallback>
                {r.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>

        {/* Summary text fills the middle */}
        <span className="flex-1 text-sm text-foreground">
          {buildSummaryText(requests)}
        </span>

        {/* Chevron: rotates 180 degrees when expanded */}
        <motion.button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={BOUNCY_SPRING}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <IconChevronDown className="size-4" />
        </motion.button>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <IconX className="size-4" />
        </button>
      </div>

      {/* Expanded list: animated height with staggered rows */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={EXPAND_SPRING}
            className="overflow-hidden"
          >
            {/* Top border to visually separate from collapsed bar */}
            <div className="border-t border-border" />
            <div className="py-1">
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  /* Stagger: each row slides in slightly after the previous */
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    ...BOUNCY_SPRING,
                    delay: index * 0.05,
                  }}
                >
                  <AccessRequestRow
                    request={request}
                    decision={decisions[request.id] ?? "undecided"}
                    onApprove={() => handleApprove(request.id)}
                    onReject={() => handleReject(request.id)}
                    onReset={() => handleReset(request.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Verify the full file compiles**

Run: `cd frontend && bunx --bun tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/components/access-request-banner.tsx
git commit -m "feat(ui): add AccessRequestBanner component with animated expand/collapse and approve/reject pills"
```

---

## Chunk 2: Dev Test Route

### Task 4: Create the dev route with mock data

**Files:**
- Create: `frontend/app/dev/access-requests/page.tsx`

- [ ] **Step 1: Create the dev route**

```tsx
"use client";

import {
  AccessRequestBanner,
  type AccessRequest,
} from "@/components/access-request-banner";
import { useState } from "react";

/** Mock data for testing the banner with various name lengths and counts. */
const MOCK_REQUESTS: AccessRequest[] = [
  { id: "1", name: "Octavian Tocan" },
  { id: "2", name: "Jane Smith" },
  { id: "3", name: "Alex Chen" },
  { id: "4", name: "Maria Lopez" },
  { id: "5", name: "Sam Wilson" },
];

/**
 * Dev-only route for testing the AccessRequestBanner component.
 *
 * Renders three variants: full list (5 users), two users, and single user.
 * Logs approve/reject/dismiss actions to console.
 */
export default function AccessRequestsDevPage() {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <h1 className="text-2xl font-bold">Access Request Banner - Dev</h1>

      {/* Full list: 5 users */}
      {!dismissed.full && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">5 users:</p>
          <AccessRequestBanner
            requests={MOCK_REQUESTS}
            onApprove={(id) => console.log("Approved:", id)}
            onReject={(id) => console.log("Rejected:", id)}
            onDismiss={() => setDismissed((d) => ({ ...d, full: true }))}
          />
        </div>
      )}

      {/* Two users */}
      {!dismissed.two && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">2 users:</p>
          <AccessRequestBanner
            requests={MOCK_REQUESTS.slice(0, 2)}
            onApprove={(id) => console.log("Approved:", id)}
            onReject={(id) => console.log("Rejected:", id)}
            onDismiss={() => setDismissed((d) => ({ ...d, two: true }))}
          />
        </div>
      )}

      {/* Single user */}
      {!dismissed.single && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">1 user:</p>
          <AccessRequestBanner
            requests={MOCK_REQUESTS.slice(0, 1)}
            onApprove={(id) => console.log("Approved:", id)}
            onReject={(id) => console.log("Rejected:", id)}
            onDismiss={() => setDismissed((d) => ({ ...d, single: true }))}
          />
        </div>
      )}

      {/* Reset button if all dismissed */}
      {Object.keys(dismissed).length > 0 && (
        <button
          type="button"
          onClick={() => setDismissed({})}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Reset all banners
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && bunx --bun tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Start dev server and test visually**

Run: `cd "/Volumes/Crucial X10/Projects/pawrrtal" && bun run frontend:dev`
Navigate to: `http://localhost:3001/dev/access-requests`

Verify:
- Three banner variants render (5, 2, 1 users)
- Chevron rotates with bounce on click
- Expanded list staggers in
- Approve/Reject pills work and bounce
- Decided state shows green/red pill
- Clicking decided pill resets to undecided
- X dismisses each banner
- Console logs fire on approve/reject

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dev/access-requests/page.tsx
git commit -m "feat(dev): add access-requests dev route for banner testing"
```
