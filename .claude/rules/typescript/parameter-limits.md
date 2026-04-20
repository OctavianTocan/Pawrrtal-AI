---
description: Limit function parameters — group into objects when > 3
globs: "**/*.{ts,tsx}"
---
# Function Parameter Limits

Functions (including hooks) should accept at most 3 positional parameters.
Beyond that, group related parameters into an options/deps object with a
named interface. This makes call sites readable, allows adding parameters
without breaking existing callers, and enables IDE autocomplete on the
property names.

## Verify
"Does any function accept more than 3 parameters? If so, is there a named
interface grouping them?"

## Patterns

Bad -- 6 positional parameters:

```typescript
function useConversationInteraction(
  focusZone: FocusZone,
  navigateTo: (href: string) => void,
  visibleIds: string[],
  focusAtIndex: (index: number) => void,
  selectionState: MultiSelectState,
  setSelectionState: Dispatch<SetStateAction<MultiSelectState>>
) { ... }
```

Good -- single deps object with named interface:

```typescript
interface ConversationInteractionDeps {
  focusZone: FocusZone;
  navigateTo: (href: string) => void;
  visibleIds: string[];
  focusAtIndex: (index: number) => void;
  selectionState: MultiSelectState;
  setSelectionState: Dispatch<SetStateAction<MultiSelectState>>;
}

function useConversationInteraction(deps: ConversationInteractionDeps) { ... }
```
