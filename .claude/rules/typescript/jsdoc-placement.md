---
description: "JSDoc blocks must sit directly above the declaration they document"
globs: ["frontend/**/*.ts", "frontend/**/*.tsx"]
---

# JSDoc Placement

A JSDoc block is associated with the **next** declaration immediately below it.
If any other export, type, or statement sits between the block and its target, IDEs
cannot associate the documentation and consumers see no hover docs.

## Rule

Place every `/** ... */` block directly above the declaration it documents, with no
intervening code or exports.

### Bad

```ts
/**
 * @property id - Unique identifier.
 * @property name - Display name.
 */

export type Foo = { ... };
export type Bar = { ... };

export interface Target {  // ← IDE shows no docs
  id: string;
  name: string;
}
```

### Good

```ts
export type Foo = { ... };
export type Bar = { ... };

/**
 * @property id - Unique identifier.
 * @property name - Display name.
 */
export interface Target {
  id: string;
  name: string;
}
```

File-level documentation should use `@fileoverview` at the top of the file
(per `file-level-docstrings.md`), separate from any interface/type docs.
