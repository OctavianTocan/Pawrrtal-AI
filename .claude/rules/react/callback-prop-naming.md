---
description: React callback prop naming convention (on* prefix)
globs: frontend/**/*.tsx,frontend/**/*.ts
---
# Callback Prop Naming Convention

Callback props on React components use the `on*` prefix, not `handle*`.

The `handle*` prefix is for the **implementation** (the function defined in the
parent). The `on*` prefix is for the **interface** (the prop name the child
component accepts). Mixing them up makes the call site read as if the child owns
the behavior rather than the parent.

## Verify
"Are all callback props named with `on*`? Are all handler implementations named
with `handle*`? Is there a clean parent→child handoff?"

## Patterns

Bad -- `handle*` as prop names:

```tsx
function ConversationDialogs({
  handleRenameSubmit,
  handleDeleteConfirm,
}: {
  handleRenameSubmit: () => void;
  handleDeleteConfirm: () => void;
}) {
  return <Dialog onSubmit={handleRenameSubmit} />;
}

// Call site: confusing because "handle" leaks into the child's interface
<ConversationDialogs
  handleRenameSubmit={handleRenameSubmit}
  handleDeleteConfirm={handleDeleteConfirm}
/>
```

Good -- `on*` props, `handle*` implementations:

```tsx
function ConversationDialogs({
  onRenameSubmit,
  onDeleteConfirm,
}: {
  onRenameSubmit: () => void;
  onDeleteConfirm: () => void;
}) {
  return <Dialog onSubmit={onRenameSubmit} />;
}

// Call site: clear that the parent owns the handler
<ConversationDialogs
  onRenameSubmit={handleRenameSubmit}
  onDeleteConfirm={handleDeleteConfirm}
/>
```
