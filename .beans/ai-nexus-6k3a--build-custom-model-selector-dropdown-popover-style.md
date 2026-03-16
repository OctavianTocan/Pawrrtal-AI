---
# ai-nexus-6k3a
title: Build custom model selector dropdown (popover style, grouped by provider)
status: todo
type: feature
priority: high
created_at: 2026-03-12T00:28:54Z
updated_at: 2026-03-12T00:44:45Z
parent: ai-nexus-3i2d
---

## Goal

Replace the current ai-elements `ModelSelector` (dialog-based, from library) with a custom popover-style model selector inspired by Windsurf and Codex's UIs:

- **Trigger**: Small button in the chat input area showing current model name + provider icon (like "GPT-5.4 v" or "glm-5 v" in the screenshots)
- **Popover**: Opens a floating dropdown (not a full dialog) anchored to the trigger button
- **Grouped by provider**: Models grouped under provider headings (e.g., "ANTHROPIC", "GOOGLE", "OPENAI")
- **Checkmark on selected**: Current model has a checkmark
- **Chevron for sub-options**: Optional chevron ">" for models with variants (future)
- **Provider icons**: Small colored icons next to model names
- **Clean, minimal design**: Dark theme compatible, subtle borders, no search bar (keep it simple for now)

## Design Reference

See the two screenshots attached to the bean creation conversation:
1. Windsurf: Grouped by provider ("ANTHROPIC", "CRAFT AGENTS BACKEND"), checkmark on selected, chevrons, popover anchored near input
2. Codex: Simple flat list under "Select model" heading, checkmark on selected, anchored to model button in input bar

We want a hybrid: Codex's simplicity + Windsurf's provider grouping.

## Architecture (inspired by HeroUI Autocomplete)

Build this from scratch as a learning exercise. The component follows a **hook + compound component** pattern like HeroUI's autocomplete, but simplified for our model selector use case.

### Layer 1: State Hook (`useModelSelector`)

Create `frontend/hooks/use-model-selector.ts` with:

```typescript
interface UseModelSelectorProps {
  models: ModelGroup[];           // Grouped model data
  selectedModelId: string | null;
  onSelect: (modelId: string) => void;
  defaultOpen?: boolean;
}

interface UseModelSelectorReturn {
  // State
  isOpen: boolean;
  inputValue: string;             // Filter text
  focusedKey: string | null;      // Virtual focus key
  filteredGroups: ModelGroup[];   // Groups after filtering
  
  // Prop getters (like HeroUI pattern)
  getTriggerProps: () => ButtonHTMLAttributes;
  getPopoverProps: () => DivHTMLAttributes;
  getInputProps: () => InputHTMLAttributes;
  getListboxProps: () => UlHTMLAttributes;
  getOptionProps: (modelId: string) => LiHTMLAttributes;
  getGroupProps: (provider: string) => DivHTMLAttributes;
}
```

**State managed:**
- `isOpen` (boolean) - popover visibility
- `inputValue` (string) - filter/search text
- `focusedKey` (string | null) - which item has virtual keyboard focus
- `selectedKey` (string | null) - which model is selected (internal state; external selection is exposed through `selectedModelId`/public callbacks)

### Layer 2: Filtering

```typescript
// Client-side filtering on each keystroke
const filteredGroups = useMemo(() => {
  if (!inputValue) return groups;
  return groups
    .map(group => ({
      ...group,
      models: group.models.filter(m =>
        m.displayName.toLowerCase().includes(inputValue.toLowerCase())
      )
    }))
    .filter(group => group.models.length > 0);
}, [inputValue, groups]);
```

### Layer 3: Keyboard Navigation

Handle these keyboard events on the input:

| Key | Action |
|-----|--------|
| `ArrowDown` | Move focusedKey to next item (skip group headers), open if closed |
| `ArrowUp` | Move focusedKey to previous item |
| `Enter` | Select focusedKey, close popover |
| `Escape` | Close popover, clear filter |
| `Home` | Jump to first item |
| `End` | Jump to last item |
| Any character | Filter items, open popover |

**Virtual Focus Pattern** (critical for accessibility):
- The `<input>` stays focused at all times (never move DOM focus to list items)
- Use `aria-activedescendant="option-{focusedKey}"` on the input to tell screen readers which item is active
- Style the "focused" item via a data attribute or className, not :focus

```typescript
// Navigation helper
function getNextKey(currentKey, flatItems) {
  const idx = flatItems.findIndex(i => i.id === currentKey);
  return flatItems[Math.min(idx + 1, flatItems.length - 1)]?.id ?? null;
}
```

### Layer 4: Popover Positioning

- Use `getBoundingClientRect()` on the trigger to position the popover
- Check `window.innerHeight - triggerRect.bottom` for flip logic
- Set `width` to match trigger width (or a min-width)
- Add a small gap (4-8px) between trigger and popover
- Consider using a portal (`createPortal`) so the popover isn't clipped by overflow parents

```typescript
const updatePosition = useCallback(() => {
  const rect = triggerRef.current?.getBoundingClientRect();
  if (!rect) return;
  const spaceBelow = window.innerHeight - rect.bottom;
  const flipUp = spaceBelow < MAX_HEIGHT;
  setPosition({
    top: flipUp ? rect.top - actualHeight - 4 : rect.bottom + 4,
    left: rect.left,
    width: Math.max(rect.width, 220),
  });
}, []);
```

### Layer 5: Accessibility (ARIA)

```html
<\!-- Trigger button -->
<button
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-controls="model-listbox"
/>

<\!-- Search input (inside popover) -->
<input
  role="searchbox"
  aria-activedescendant={focusedKey ? `option-${focusedKey}` : undefined}
  aria-controls="model-listbox"
/>

<\!-- Listbox -->
<ul id="model-listbox" role="listbox" aria-label="Select model">
  <\!-- Group -->
  <li role="presentation">
    <div role="group" aria-labelledby="group-google">
      <span id="group-google" role="presentation">GOOGLE</span>
      <\!-- Items -->
      <ul role="group">
        <li
          id="option-gemini-3-flash"
          role="option"
          aria-selected={isSelected}
        >
          Gemini 3 Flash
        </li>
      </ul>
    </div>
  </li>
</ul>

<\!-- Live region for screen reader announcements -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {filteredCount} models available
</div>
```

### Layer 6: Click Outside / Focus Trap

```typescript
// Close on click outside
useEffect(() => {
  if (!isOpen) return;
  const handler = (e: MouseEvent) => {
    if (!popoverRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)) {
      close();
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [isOpen]);
```

## Component Structure

```text
<ModelSelectorPopover>                    // Wrapper, manages context
  <ModelSelectorTrigger />                // Button: "Gemini 3 Flash v"
  <ModelSelectorContent>                  // Portal'd popover
    <ModelSelectorSearch />               // Filter input (optional, can skip initially)
    <ModelSelectorList>                   // <ul role="listbox">
      <ModelSelectorGroup label="GOOGLE">  // Group heading
        <ModelSelectorOption                // <li role="option">
          id="gemini-3-flash"
          icon={<GoogleIcon />}
          selected={true}
        >
          Gemini 3 Flash Preview
        </ModelSelectorOption>
      </ModelSelectorGroup>
    </ModelSelectorList>
    <ModelSelectorEmpty />                // "No models found"
  </ModelSelectorContent>
</ModelSelectorPopover>
```

## Implementation Checklist

- [ ] **Hook**: Create `use-model-selector.ts` with state (open, inputValue, focusedKey, selectedKey), filtering logic, and prop getter functions
- [ ] **Keyboard nav**: Implement ArrowUp/Down/Enter/Escape handling with virtual focus (`aria-activedescendant`, no DOM focus on items)
- [ ] **Popover positioning**: `getBoundingClientRect()` based positioning with flip logic, render via `createPortal`
- [ ] **Click outside**: Close popover on clicks outside trigger + popover
- [ ] **Compound component**: Build `ModelSelectorPopover`, `Trigger`, `Content`, `List`, `Group`, `Option`, `Search`, `Empty` sub-components sharing context
- [ ] **Styling**: Tailwind classes matching the dark popover aesthetic - subtle border, rounded corners, provider group headings in muted uppercase, checkmark on selected, hover/focus highlight
- [ ] **Accessibility**: ARIA roles (combobox, listbox, option, group), aria-expanded, aria-selected, aria-activedescendant, sr-only live region for match count
- [ ] **Animation**: Subtle scale+opacity transition on open/close (respect prefers-reduced-motion)

## Provider Icons/Logos

Use the same pattern as the existing `ai-elements/model-selector.tsx` for provider logos:
```tsx
<img src={`https://models.dev/logos/${provider}.svg`} className="size-3 dark:invert" />
```
Provider slugs: "google", "anthropic", "openai", etc. This gives us free, maintained SVG logos.

Alternatively, bundle a few key SVGs locally in `frontend/public/providers/` if we want offline support.

## Design Spec (from screenshots)

- **Trigger**: Compact pill/button with provider icon + model name + chevron-down
- **Popover**: ~220-280px wide, max-height ~350px with scroll
- **Group headings**: Uppercase, muted color (text-muted-foreground), small font, px-3 py-1.5
- **Option items**: px-3 py-2, flex row: [icon] [name] [checkmark if selected] [chevron if has submenu]
- **Hover state**: Subtle background highlight (bg-accent)
- **Selected state**: Checkmark icon on the right
- **Focused state** (keyboard): Same as hover but triggered by virtual focus
- **Separator**: Thin border between groups (border-b border-border)
- **Transition**: `transition-all duration-150` on open/close

## Notes

- Do NOT use the existing `ai-elements/model-selector.tsx` (that's a full dialog/command, not what we want)
- Do NOT install HeroUI or React Aria. Build from scratch using raw React + DOM APIs
- This is purely the UI component; wiring it to real data is a separate task (`ai-nexus-l8pt`)
- Use mock data initially (hardcoded Google/Anthropic/OpenAI groups with a few models each)
- The search/filter input is optional for v1. Can start without it and add later
