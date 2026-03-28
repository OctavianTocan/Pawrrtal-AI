# Gate Persisted State by Validity

When using persisted state (localStorage, URL params), always gate the
restored value by current validity. A persisted collapsed-group key should
not hide items when only one group exists. A persisted selected-tab ID
should not select a tab that no longer exists. Blindly trusting persisted
values causes invisible UI states where content disappears for no apparent
reason.

## Verify
"Does every persisted value get validated against the current data before
being applied? Could stale persisted state hide content or select
something that no longer exists?"

## Patterns

Bad -- persisted set applied without validation:

```tsx
const [collapsed, setCollapsed] = useLocalStorage<Set<string>>(
  "collapsed-groups",
  new Set()
);

return groups.map((group) =>
  collapsed.has(group.id) ? null : <GroupPanel key={group.id} group={group} />
);
```

Good -- persisted set gated by current validity:

```tsx
const [persistedCollapsed, setCollapsed] = useLocalStorage<Set<string>>(
  "collapsed-groups",
  new Set()
);

const canCollapse = groups.length > 1;

return groups.map((group) => {
  const isCollapsed = canCollapse && persistedCollapsed.has(group.id);
  return isCollapsed ? null : <GroupPanel key={group.id} group={group} />;
});
```
