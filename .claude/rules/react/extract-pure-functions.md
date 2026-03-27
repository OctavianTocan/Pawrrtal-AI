# Extract Pure Functions to lib/

Pure utility functions (date formatting, data grouping, text processing)
that don't depend on React or component state must live in `lib/` utility
files, not in component files. This follows the Single Responsibility
Principle, enables unit testing without rendering components, and keeps
component files focused on rendering logic.

## Verify
"Are there any pure helper functions defined inside a component file that
could be extracted to `lib/`? Does the function reference any React hooks,
props, or component state?"

## Patterns

Bad -- pure function buried in component file:

```tsx
// components/chat-list.tsx
function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();
  for (const msg of messages) {
    const key = msg.createdAt.toLocaleDateString();
    groups.set(key, [...(groups.get(key) ?? []), msg]);
  }
  return groups;
}

export function ChatList({ messages }: Props): React.JSX.Element {
  const grouped = groupMessagesByDate(messages);
  // ...
}
```

Good -- utility extracted to lib/:

```tsx
// lib/messages.ts
export function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();
  for (const msg of messages) {
    const key = msg.createdAt.toLocaleDateString();
    groups.set(key, [...(groups.get(key) ?? []), msg]);
  }
  return groups;
}

// components/chat-list.tsx
import { groupMessagesByDate } from "@/lib/messages";

export function ChatList({ messages }: Props): React.JSX.Element {
  const grouped = groupMessagesByDate(messages);
  // ...
}
```
