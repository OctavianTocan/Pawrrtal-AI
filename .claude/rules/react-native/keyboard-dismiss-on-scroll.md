---
name: keyboard-dismiss-on-scroll
paths: ["**/*"]
---

# Keyboard Dismiss on Scroll

Every ScrollView that coexists with text inputs must set
`keyboardDismissMode` so the keyboard dismisses when the user scrolls.
Without this, users are forced to tap a cancel button or tap outside the
input — which feels broken.

## Implementation

```tsx
<ScrollView keyboardDismissMode="on-drag">
  {/* content with text inputs */}
</ScrollView>
```

Options:

- `"on-drag"` — keyboard dismisses as soon as the user starts scrolling
  (recommended for most screens)
- `"interactive"` — keyboard tracks the scroll gesture and can be dragged
  down (iOS only, good for chat screens)
- `"none"` — default, keyboard stays open (almost never what you want)

Also works on FlatList and SectionList (they extend ScrollView).

## Anti-pattern

Don't use `Keyboard.dismiss()` in a scroll handler or wrap everything in
a `TouchableWithoutFeedback` with `onPress={Keyboard.dismiss}`. The native
`keyboardDismissMode` handles this correctly and with proper gesture
interaction.

## Verify

"Does every ScrollView/FlatList that shares a screen with text inputs have
`keyboardDismissMode` set? Is `'on-drag'` used for general screens and
`'interactive'` for chat-style screens?"

## Patterns

Bad — manual keyboard dismiss via scroll handler:

```tsx
<ScrollView onScroll={() => Keyboard.dismiss()}>
  <TextInput />
</ScrollView>
```

Good — native `keyboardDismissMode` prop:

```tsx
<ScrollView keyboardDismissMode="on-drag">
  <TextInput />
</ScrollView>
```
