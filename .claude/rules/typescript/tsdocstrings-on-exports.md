# TSDocstrings on Exports

Every exported function, component, hook, and type must have a TSDocstring.
Interface and type-object props should have inline `/** ... */` comments on
each property. Do NOT use `@property` block tags on the interface-level
docstring -- those do not surface in IDE hover tooltips when a consumer
references a specific property. The interface-level docstring should be a
one-liner describing the type; per-property docs go inline.

Skip for re-exports and shadcn/ui generated components. Documentation at
the export boundary is where it matters most -- it's what consumers see in
hover tooltips and what prevents misuse of public APIs.

## Verify
"Does every exported symbol have a TSDocstring? Do interface properties
have inline doc comments? Am I skipping only re-exports and generated
shadcn/ui components?"

## Patterns

Bad -- exported function with no docs:

```tsx
export function formatRelativeTime(date: Date): string {
  // ...
}

export interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  onRetry: () => void;
}
```

Bad -- @property block tags instead of inline docs:

```tsx
/**
 * Props for the chat message component.
 *
 * @property message - The message to render.
 * @property isLast - Whether this is the last message.
 * @property onRetry - Callback to retry a failed message.
 */
export interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  onRetry: () => void;
}
```

Good -- exports documented with TSDocstrings and inline property docs:

```tsx
/** Format a date as a human-readable relative time string (e.g. "3 min ago"). */
export function formatRelativeTime(date: Date): string {
  // ...
}

export interface ChatMessageProps {
  /** The message to render. */
  message: Message;
  /** Whether this is the last message in the conversation. */
  isLast: boolean;
  /** Callback to retry a failed message. */
  onRetry: () => void;
}
```
