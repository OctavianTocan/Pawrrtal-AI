---
name: use-native-headersearchbaroptions-not-custom-input
paths: ["**/*"]
---

# Use Native headerSearchBarOptions Instead of Custom TextInput for iOS Search

When a screen needs a search/filter input at the top, use the native
`headerSearchBarOptions` instead of building a custom TextInput in the
header. This gives you the native iOS search bar with collapse, cancel
button, and keyboard handling for free — in 3 lines.

## Implementation

Set `headerSearchBarOptions` on Stack.Screen options:

```tsx
<Stack.Screen
  options={{
    headerSearchBarOptions: {
      placeholder: 'Search...',
      hideWhenScrolling: false, // true = collapses on scroll
      onChangeText: (event) => setQuery(event.nativeEvent.text),
    },
  }}
/>
```

- Works with `headerLargeTitle` — the search bar appears below the large
  title and becomes sticky when scrolled to the top
- Set `hideWhenScrolling: false` to keep the search bar always visible
- Set `hideWhenScrolling: true` (default) to collapse it on scroll

## Anti-pattern

Don't build a custom header with a TextInput when the screen is a
Stack.Screen. The native search bar handles focus, cancel, keyboard
dismiss, and scroll integration automatically.

## Verify

"Is there a custom TextInput being used as a search field in a navigation
header? Could it be replaced with `headerSearchBarOptions`?"

## Patterns

Bad — custom TextInput in the header:

```tsx
<Stack.Screen
  options={{
    headerTitle: () => (
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search..."
        style={{ flex: 1, height: 40, backgroundColor: '#eee', borderRadius: 8 }}
      />
    ),
  }}
/>
```

Good — native search bar with 3 lines:

```tsx
<Stack.Screen
  options={{
    headerSearchBarOptions: {
      placeholder: 'Search...',
      hideWhenScrolling: false,
      onChangeText: (event) => setQuery(event.nativeEvent.text),
    },
  }}
/>
```
