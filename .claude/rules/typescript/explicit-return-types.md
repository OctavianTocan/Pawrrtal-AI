# Explicit Return Types

Every function must have an explicit return type annotation. Components
return `React.JSX.Element`. Async functions return `Promise<ReturnType>`.
Void functions return `void`. This prevents accidental return-type changes
from propagating silently through the codebase -- a refactor that changes
what a function returns will be caught at the declaration site, not at
every distant call site.

## Verify
"Does every function have an explicit return type? Are components typed as
`React.JSX.Element`? Are async functions typed as `Promise<T>`?"

## Patterns

Bad -- inferred return types:

```tsx
export function ChatList({ messages }: Props) {
  return <div>{messages.map((m) => <ChatMessage key={m.id} message={m} />)}</div>;
}

export async function fetchMessages(chatId: string) {
  const res = await fetch(`/api/chats/${chatId}/messages`);
  return res.json();
}

function clearDraft(chatId: string) {
  localStorage.removeItem(`draft-${chatId}`);
}
```

Good -- explicit return types:

```tsx
export function ChatList({ messages }: Props): React.JSX.Element {
  return <div>{messages.map((m) => <ChatMessage key={m.id} message={m} />)}</div>;
}

export async function fetchMessages(chatId: string): Promise<Message[]> {
  const res = await fetch(`/api/chats/${chatId}/messages`);
  return res.json();
}

function clearDraft(chatId: string): void {
  localStorage.removeItem(`draft-${chatId}`);
}
```
