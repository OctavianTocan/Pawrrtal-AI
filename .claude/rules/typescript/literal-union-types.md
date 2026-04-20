# Literal Union Types for Constrained Strings

When a string field only accepts a fixed set of known values, type it as a
literal union instead of bare `string`. This catches invalid values at
compile time and makes the constraint self-documenting.

If the JSDoc or comments enumerate valid values but the type says `string`,
the type is wrong.

## Verify
"Does any `string`-typed field have a known, finite set of valid values?
If so, is it typed as a literal union?"

## Patterns

Bad -- bare string when values are known:

```ts
export type ConversationLabel = {
  /** Type hint: "string", "number", or "date". */
  valueType?: string;
};
```

Good -- literal union encodes the constraint:

```ts
export type ConversationLabel = {
  /** Semantic type hint for the label's value. */
  valueType?: 'string' | 'number' | 'date';
};
```

Bad -- duplicating literals from an existing type alias:

```ts
export type MessageRole = 'user' | 'assistant' | 'plan';

export interface AgnoMessage {
  role: 'user' | 'assistant'; // duplicates MessageRole minus 'plan'
}
```

Good -- derive from the source type:

```ts
export type MessageRole = 'user' | 'assistant' | 'plan';

export interface AgnoMessage {
  role: Exclude<MessageRole, 'plan'>;
}
```

## Notes

- If the set of values comes from a backend enum or API spec, keep the
  literal union as the single source of truth and export it.
- When the field genuinely accepts arbitrary strings (user input, free-form
  text), `string` is correct. This rule targets fields where the valid
  values are enumerable and documented.
