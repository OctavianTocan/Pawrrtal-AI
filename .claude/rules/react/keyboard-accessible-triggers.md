# Keyboard Accessible Triggers

Never use `div` as a DropdownMenuTrigger or similar interactive trigger.
Use `button type="button"` with `aria-label` so the control is
keyboard-focusable via Tab and announced correctly by screen readers. A
`div` is not in the tab order by default and lacks implicit button
semantics, making the control invisible to keyboard and assistive
technology users.

## Verify
"Is every interactive trigger (dropdown, popover, dialog) using a `button`
element? Does it have `type='button'` and an `aria-label`?"

## Patterns

Bad -- div trigger is not keyboard-focusable:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <div className="flex items-center gap-2">
      <Settings className="h-4 w-4" />
    </div>
  </DropdownMenuTrigger>
</DropdownMenu>
```

Good -- button trigger is focusable and labeled:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button type="button" aria-label="Open settings">
      <Settings className="h-4 w-4" />
    </button>
  </DropdownMenuTrigger>
</DropdownMenu>
```
