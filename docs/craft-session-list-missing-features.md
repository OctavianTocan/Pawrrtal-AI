# Craft Session List: missing features extracted from source

Source: Craft upstream repository (internal). Consult the upstream repo for authoritative implementations.

This doc summarizes the relevant rendering behavior and state / hook logic used by Craft for the 5 Session List features currently missing in `ai-nexus`, with upstream file paths noted for reference.

---

## 1) Activity / State Indicators

### Primary render path

**File:** `apps/electron/src/renderer/components/app-shell/SessionItem.tsx`

```tsx
const activeMatch = ctx.activeChatMatchInfo
const isActiveSession = isSelected && activeMatch?.sessionId === item.id
const ripgrepMatchCount = ctx.contentSearchResults.get(item.id)?.matchCount
const chatMatchCount = isActiveSession ? activeMatch!.count : ripgrepMatchCount
const hasMatch = chatMatchCount != null && chatMatchCount > 0
const hasLabels = !!(item.labels && item.labels.length > 0 && ctx.flatLabels.length > 0 && item.labels.some(entry => {
  const labelId = extractLabelId(entry)
  return ctx.flatLabels.some(l => l.id === labelId)
}))
const hasPendingPrompt = ctx.hasPendingPrompt?.(item.id) ?? false
```

```tsx
icon={
  <>
    <SessionStatusIcon item={item} />
    <div className={cn(
      "flex items-center justify-center overflow-hidden gap-1",
      "transition-all duration-200 ease-out",
      (item.isProcessing || hasUnreadMeta(item) || item.lastMessageRole === 'plan' || hasPendingPrompt)
        ? "opacity-100 ml-0"
        : "!w-0 opacity-0 -ml-[10px]"
    )}>
      {item.isProcessing && <Spinner className="text-[10px]" />}
      {hasUnreadMeta(item) && (
        <svg className="text-accent h-3.5 w-3.5" viewBox="0 0 25 24" fill="currentColor">
          <g transform="translate(1.748, 0.7832)">
            <path fillRule="nonzero" d="M10.9952443,22 C8.89638276,22 7.01311428,21.5426195 5.34543882,20.6278586 C4.85718403,21.0547471 4.29283758,21.3901594 3.65239948,21.6340956 C3.01196138,21.8780319 2.3651823,22 1.71206226,22 C1.5028102,22 1.34111543,21.9466389 1.22697795,21.8399168 C1.11284047,21.7331947 1.05735697,21.6016979 1.06052745,21.4454262 C1.06369794,21.2891545 1.13820435,21.1347886 1.28404669,20.9823285 C1.5693904,20.6621622 1.77547197,20.3400901 1.9022914,20.0161123 C2.02911082,19.6921344 2.09252054,19.3090783 2.09252054,18.8669439 C2.09252054,18.4553015 2.02276985,18.0646223 1.88326848,17.6949064 C1.74376711,17.3251906 1.5693904,16.9383229 1.36013835,16.5343035 C1.15088629,16.1302841 0.941634241,15.6748094 0.732382188,15.1678794 C0.523130134,14.6609494 0.348753423,14.0682606 0.209252054,13.3898129 C0.0697506845,12.7113652 0,11.9147609 0,11 C0,9.40679141 0.271076524,7.93936244 0.813229572,6.5977131 C1.35538262,5.25606376 2.11946966,4.09164934 3.1054907,3.10446985 C4.09151175,2.11729037 5.25507998,1.35308385 6.59619542,0.811850312 C7.93731085,0.270616771 9.40366047,0 10.9952443,0 C12.5868281,0 14.0531777,0.270616771 15.3942931,0.811850312 C16.7354086,1.35308385 17.900562,2.11729037 18.8897536,3.10446985 C19.8789451,4.09164934 20.6446174,5.25606376 21.1867704,6.5977131 C21.7289235,7.93936244 22,9.40679141 22,11 C22,12.5932086 21.7289235,14.0606376 21.1867704,15.4022869 C20.6446174,16.7439362 19.8805303,17.9083507 18.8945093,18.8955301 C17.9084883,19.8827096 16.74492,20.6469161 15.4038046,21.1881497 C14.0626891,21.7293832 12.593169,22 10.9952443,22 Z" />
          </g>
        </svg>
      )}
      {item.lastMessageRole === 'plan' && (
        <svg className="text-success h-3.5 w-3.5" viewBox="0 0 25 24" fill="currentColor">
          <path fillRule="nonzero" d="M13.7207031,22.6523438 C13.264974,22.6523438 12.9361979,22.4895833 12.734375,22.1640625 C12.5325521,21.8385417 12.360026,21.4316406 12.2167969,20.9433594 L10.6640625,15.7871094 C10.5729167,15.4615885 10.5403646,15.1995443 10.5664062,15.0009766 C10.5924479,14.8024089 10.6998698,14.6022135 10.8886719,14.4003906 L20.859375,3.6484375 C20.9179688,3.58984375 20.9472656,3.52473958 20.9472656,3.453125 C20.9472656,3.38151042 20.921224,3.32291667 20.8691406,3.27734375 C20.8170573,3.23177083 20.7568359,3.20735677 20.6884766,3.20410156 C20.6201172,3.20084635 20.5566406,3.22851562 20.4980469,3.28710938 L9.78515625,13.296875 C9.5703125,13.4921875 9.36197917,13.601237 9.16015625,13.6240234 C8.95833333,13.6468099 8.70117188,13.609375 8.38867188,13.5117188 L3.11523438,11.9101562 C2.64648438,11.7669271 2.25911458,11.5960286 1.953125,11.3974609 C1.64713542,11.1988932 1.49414062,10.875 1.49414062,10.4257812 C1.49414062,10.0742188 1.63411458,9.77148438 1.9140625,9.51757812 C2.19401042,9.26367188 2.5390625,9.05859375 2.94921875,8.90234375 L19.7460938,2.46679688 C19.9739583,2.38216146 20.1871745,2.31542969 20.3857422,2.26660156 C20.5843099,2.21777344 20.764974,2.19335938 20.9277344,2.19335938 C21.2467448,2.19335938 21.4973958,2.28450521 21.6796875,2.46679688 C21.8619792,2.64908854 21.953125,2.89973958 21.953125,3.21875 C21.953125,3.38802083 21.9287109,3.5703125 21.8798828,3.765625 C21.8310547,3.9609375 21.7643229,4.17252604 21.6796875,4.40039062 L15.2832031,21.109375 C15.1009115,21.578125 14.8828125,21.952474 14.6289062,22.2324219 C14.375,22.5123698 14.0722656,22.6523438 13.7207031,22.6523438 Z" />
        </svg>
      )}
      {hasPendingPrompt && <ShieldAlert className="h-3.5 w-3.5 text-info" />}
    </div>
  </>
}
```

### Pending prompt source

**File:** `apps/electron/src/renderer/components/app-shell/AppShell.tsx`

```tsx
const hasPendingPrompt = React.useCallback((sessionId: string) => {
  return (pendingPermissions.get(sessionId)?.length ?? 0) > 0
}, [pendingPermissions])
```

**And passed into `SessionList`:**

```tsx
<SessionList
  ...
  hasPendingPrompt={hasPendingPrompt}
  activeChatMatchInfo={chatMatchInfo}
/>
```

### Wiring through list context

**File:** `apps/electron/src/renderer/components/app-shell/SessionList.tsx`

```tsx
const listContext = useMemo((): SessionListContextValue => ({
  ...
  contentSearchResults,
  activeChatMatchInfo,
  hasPendingPrompt,
}), [
  ...,
  contentSearchResults, activeChatMatchInfo, hasPendingPrompt,
])
```

### What this does

- `item.isProcessing` renders the tiny spinner.
- `hasUnreadMeta(item)` renders the unread meta glyph.
- `item.lastMessageRole === 'plan'` renders the green plan triangle.
- `hasPendingPrompt(item.id)` renders the `ShieldAlert` icon.
- The indicator cluster is animated in/out by width/opacity/margin classes instead of conditionally mounting the wrapper.

### Porting notes for `ai-nexus`

You need all four pieces, not just the SVGs:
1. per-session booleans (`isProcessing`, unread meta, last role, pending prompt),
2. a shared list context / props channel,
3. the animated icon group wrapper,
4. the pending permission map lookup from the shell-level state.

---

## 2) Search Match Badges

### Badge rendering

**File:** `apps/electron/src/renderer/components/app-shell/SessionItem.tsx`

```tsx
const activeMatch = ctx.activeChatMatchInfo
const isActiveSession = isSelected && activeMatch?.sessionId === item.id
const ripgrepMatchCount = ctx.contentSearchResults.get(item.id)?.matchCount
const chatMatchCount = isActiveSession ? activeMatch!.count : ripgrepMatchCount
const hasMatch = chatMatchCount != null && chatMatchCount > 0
```

```tsx
titleTrailing={hasMatch ? (
  <span
    className={cn(
      "inline-flex items-center justify-center min-w-[24px] px-1 py-0.5 rounded-[6px] text-[10px] font-medium tabular-nums leading-tight whitespace-nowrap shadow-tinted",
      isSelected
        ? "bg-yellow-300/50 border border-yellow-500 text-yellow-900"
        : "bg-yellow-300/10 border border-yellow-600/20 text-yellow-800"
    )}
    style={{
      '--shadow-color': isSelected ? '234, 179, 8' : '133, 77, 14',
    } as React.CSSProperties}
    title={`Matches found (${nextHotkey} next, ${prevHotkey} prev)`}
  >
    {chatMatchCount}
  </span>
) : item.isFlagged ? (
  <div className="p-1 flex items-center justify-center">
    <Flag className="h-3.5 w-3.5 text-info" />
  </div>
) : item.lastMessageAt ? (
  <span className="text-[11px] text-foreground/40 whitespace-nowrap">
    {formatDistanceToNowStrict(new Date(item.lastMessageAt), { locale: shortTimeLocale as Locale, roundingMethod: 'floor' })}
  </span>
) : undefined}
```

### Search result production

**File:** `apps/electron/src/renderer/hooks/useSessionSearch.ts`

```tsx
const [contentSearchResults, setContentSearchResults] = useState<Map<string, ContentSearchResult>>(new Map())
...
const results = await window.electronAPI.searchSessionContent(workspaceId, searchQuery, searchId)
...
const resultMap = new Map<string, ContentSearchResult>()
for (const result of results) {
  resultMap.set(result.sessionId, {
    matchCount: result.matchCount,
    snippet: result.matches[0]?.snippet || '',
  })
}
setContentSearchResults(resultMap)
```

```tsx
return sortedItems
  .filter(item => contentSearchResults.has(item.id))
  .sort((a, b) => {
    const aScore = fuzzyScore(getSessionTitle(a), searchQuery)
    const bScore = fuzzyScore(getSessionTitle(b), searchQuery)

    if (aScore > 0 && bScore === 0) return -1
    if (aScore === 0 && bScore > 0) return 1
    if (aScore !== bScore) return bScore - aScore

    const countA = contentSearchResults.get(a.id)?.matchCount || 0
    const countB = contentSearchResults.get(b.id)?.matchCount || 0
    return countB - countA
  })
```

### Why the active session badge is special

Craft does **not** blindly trust the ripgrep count for the open chat. It swaps in `activeChatMatchInfo.count` when the item is both:
- selected, and
- the same session as the DOM-highlighted chat.

That avoids stale counts when in-chat highlighting and ripgrep disagree.

### Porting notes for `ai-nexus`

You need:
- a `Map<sessionId, { matchCount, snippet }>` from content search,
- optional live override for the active chat,
- the yellow `titleTrailing` pill styling,
- and the sort rule that uses title fuzzy score first, then match count.

---

## 3) Label Badges

### Session-level badge renderer

**File:** `apps/electron/src/renderer/components/app-shell/SessionBadges.tsx`

```tsx
export function SessionBadges({ item }: SessionBadgesProps) {
  const ctx = useSessionListContext()

  const resolvedLabels = useMemo(() => {
    if (!item.labels || item.labels.length === 0 || ctx.flatLabels.length === 0) return []
    return item.labels
      .map(entry => {
        const parsed = parseLabelEntry(entry)
        const config = ctx.flatLabels.find(l => l.id === parsed.id)
        if (!config) return null
        return { config, rawValue: parsed.rawValue }
      })
      .filter((l): l is { config: LabelConfig; rawValue: string | undefined } => l != null)
  }, [item.labels, ctx.flatLabels])

  if (resolvedLabels.length === 0) return null

  return (
    <>
      {resolvedLabels.map(({ config, rawValue }, idx) => (
        <EntityListLabelBadge
          key={`${config.id}-${idx}`}
          label={config}
          rawValue={rawValue}
          sessionLabels={item.labels || []}
          onLabelsChange={(updated) => ctx.onLabelsChange?.(item.id, updated)}
        />
      ))}
    </>
  )
}
```

### Item-side condition to show them

**File:** `apps/electron/src/renderer/components/app-shell/SessionItem.tsx`

```tsx
const hasLabels = !!(item.labels && item.labels.length > 0 && ctx.flatLabels.length > 0 && item.labels.some(entry => {
  const labelId = extractLabelId(entry)
  return ctx.flatLabels.some(l => l.id === labelId)
}))
...
badges={hasLabels ? <SessionBadges item={item} /> : undefined}
```

### Actual pill UI

**File:** `apps/electron/src/renderer/components/ui/entity-list-label-badge.tsx`

```tsx
export function EntityListLabelBadge({ label, rawValue, sessionLabels, onLabelsChange }: EntityListLabelBadgeProps) {
  const [open, setOpen] = useState(false)
  const { isDark } = useTheme()
  const color = label.color ? resolveEntityColor(label.color, isDark) : null
  const displayValue = rawValue ? formatDisplayValue(rawValue, label.valueType) : undefined

  return (
    <LabelValuePopover
      label={label}
      value={rawValue}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(newValue) => {
        const updated = sessionLabels.map(entry => {
          const parsed = parseLabelEntry(entry)
          if (parsed.id === label.id) return formatLabelEntry(label.id, newValue)
          return entry
        })
        onLabelsChange?.(updated)
      }}
      onRemove={() => {
        const updated = sessionLabels.filter(entry => {
          const parsed = parseLabelEntry(entry)
          return parsed.id !== label.id
        })
        onLabelsChange?.(updated)
      }}
    >
      <div
        role="button"
        tabIndex={0}
        className="shrink-0 h-[18px] max-w-[120px] px-1.5 text-[10px] font-medium rounded flex items-center whitespace-nowrap gap-0.5 cursor-pointer"
        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
        style={color ? {
          backgroundColor: `color-mix(in srgb, ${color} 6%, transparent)`,
          color: `color-mix(in srgb, ${color} 75%, var(--foreground))`,
        } : {
          backgroundColor: 'rgba(var(--foreground-rgb), 0.05)',
          color: 'rgba(var(--foreground-rgb), 0.8)',
        }}
      >
        {label.name}
        {displayValue ? (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span className="font-normal truncate min-w-0" style={{ opacity: 0.75 }}>{displayValue}</span>
          </>
        ) : (
          label.valueType && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <LabelValueTypeIcon valueType={label.valueType} size={10} />
            </>
          )
        )}
      </div>
    </LabelValuePopover>
  )
}
```

### Supporting list context

**File:** `apps/electron/src/renderer/components/app-shell/SessionList.tsx`

```tsx
const flatLabels = useMemo(() => flattenLabels(labels), [labels])
...
const listContext = useMemo((): SessionListContextValue => ({
  ...
  onLabelsChange,
  flatLabels,
  labels,
  ...
}), [...])
```

### What this does

- Resolves stored label entries against the flattened label config tree.
- Renders each badge as a tiny color-mixed pill.
- Supports value-bearing labels (`label · value`) and icon fallback for typed labels.
- Stops `mousedown` propagation so clicking a badge does **not** select the session row.

### Porting notes for `ai-nexus`

If you only copy the badge component without the flattened label lookup, you’ll get dead pills or missing labels. The label tree flattening is part of the feature.

---

## 4) Multi-select visuals and logic

### Store / atom-backed selection actions

**File:** `apps/electron/src/renderer/hooks/useEntitySelection.ts`

```tsx
export function createEntitySelection() {
  const selectionAtom = atom<MultiSelectState>(createInitialState())

  function useSelection() {
    const [state, setState] = useAtom(selectionAtom)

    const actions = useMemo(() => ({
      select: (id: string, index: number) => {
        setState(singleSelect(id, index))
      },
      toggle: (id: string, index: number) => {
        setState(prev => toggleSelect(prev, id, index))
      },
      selectRange: (toIndex: number, items: string[]) => {
        setState(prev => rangeSelect(prev, toIndex, items))
      },
      selectAll: (items: string[]) => {
        setState(selectAll(items))
      },
      clearMultiSelect: () => {
        setState(prev => clearMultiSelect(prev))
      },
      removeFromSelection: (ids: string[]) => {
        setState(prev => removeFromSelection(prev, ids))
      },
      reset: () => {
        setState(createInitialState())
      },
    }), [setState])

    return {
      state,
      ...actions,
      isMultiSelectActive: isMultiSelectActive(state),
      selectionCount: getSelectionCount(state),
      isSelected: (id: string) => isItemSelected(state, id),
    }
  }
  ...
}

export const sessionSelection = createEntitySelection()
```

**File:** `apps/electron/src/renderer/hooks/useSession.ts`

```tsx
export const useSessionSelection = sessionSelection.useSelection
export const useSessionSelectionStore = sessionSelection.useSelectionStore
```

### Pure multi-select logic

**File:** `apps/electron/src/renderer/hooks/useMultiSelect.ts`

```tsx
export type MultiSelectState = {
  selected: string | null
  selectedIds: Set<string>
  anchorId: string | null
  anchorIndex: number
}
```

```tsx
export function singleSelect(id: string, index: number): MultiSelectState {
  return {
    selected: id,
    selectedIds: new Set([id]),
    anchorId: id,
    anchorIndex: index,
  }
}
```

```tsx
export function toggleSelect(state: MultiSelectState, id: string, index: number): MultiSelectState {
  const newSelectedIds = new Set(state.selectedIds)

  if (newSelectedIds.has(id)) {
    if (newSelectedIds.size > 1) {
      newSelectedIds.delete(id)
      const newSelected = state.selected === id
        ? [...newSelectedIds][0]
        : state.selected
      return {
        selected: newSelected,
        selectedIds: newSelectedIds,
        anchorId: id,
        anchorIndex: index,
      }
    }
    return state
  } else {
    newSelectedIds.add(id)
    return {
      selected: id,
      selectedIds: newSelectedIds,
      anchorId: id,
      anchorIndex: index,
    }
  }
}
```

```tsx
export function rangeSelect(
  state: MultiSelectState,
  toIndex: number,
  items: string[]
): MultiSelectState {
  if (items.length === 0) {
    return state
  }

  const clampedToIndex = Math.max(0, Math.min(toIndex, items.length - 1))

  let anchorIndex: number
  if (state.anchorIndex >= 0 && state.anchorIndex < items.length &&
      items[state.anchorIndex] === state.anchorId) {
    anchorIndex = state.anchorIndex
  } else if (state.anchorId) {
    const foundIndex = items.indexOf(state.anchorId)
    anchorIndex = foundIndex >= 0 ? foundIndex : clampedToIndex
  } else {
    anchorIndex = clampedToIndex
  }

  const startIndex = Math.min(anchorIndex, clampedToIndex)
  const endIndex = Math.max(anchorIndex, clampedToIndex)

  const newSelectedIds = new Set<string>()
  for (let i = startIndex; i <= endIndex; i++) {
    newSelectedIds.add(items[i])
  }

  return {
    selected: items[clampedToIndex],
    selectedIds: newSelectedIds,
    anchorId: state.anchorId ?? items[anchorIndex],
    anchorIndex: anchorIndex,
  }
}
```

```tsx
export function clearMultiSelect(state: MultiSelectState): MultiSelectState {
  if (!state.selected) {
    return createInitialState()
  }

  return {
    selected: state.selected,
    selectedIds: new Set([state.selected]),
    anchorId: state.selected,
    anchorIndex: state.anchorIndex,
  }
}

export function isMultiSelectActive(state: MultiSelectState): boolean {
  return state.selectedIds.size > 1
}
```

### List integration

**File:** `apps/electron/src/renderer/components/app-shell/SessionList.tsx`

```tsx
const {
  select: selectSession,
  toggle: toggleSession,
  selectRange,
  isMultiSelectActive,
} = useSessionSelection()
const selectionStore = useSessionSelectionStore()
```

```tsx
const handleToggleSelect = useCallback((row: SessionListRow, index: number) => {
  focusZone('navigator', { intent: 'click', moveFocus: false })
  toggleSession(row.item.id, index)
}, [focusZone, toggleSession])

const handleRangeSelect = useCallback((toIndex: number) => {
  focusZone('navigator', { intent: 'click', moveFocus: false })
  const allIds = flatRows.map(row => row.item.id)
  selectRange(toIndex, allIds)
}, [focusZone, flatRows, selectRange])
```

```tsx
const interactions = useEntityListInteractions<SessionListRow>({
  items: flatRows,
  getId: (row) => row.item.id,
  ...,
  multiSelect: true,
  selectionStore,
  selectedIdOverride: focusedSessionId,
})
```

```tsx
<SessionItem
  ...
  isInMultiSelect={rowProps.isInMultiSelect ?? false}
  onToggleSelect={() => handleToggleSelect(row, flatIndex)}
  onRangeSelect={() => handleRangeSelect(flatIndex)}
/>
```

### Mouse + keyboard interaction glue

**File:** `apps/electron/src/renderer/hooks/useEntityListInteractions.ts`

```tsx
const toggle = useCallback((id: string, index: number) => {
  setSelectionState(prev => MultiSelect.toggleSelect(prev, id, index))
}, [])

const range = useCallback((toIndex: number) => {
  setSelectionState(prev => MultiSelect.rangeSelect(prev, toIndex, allIds))
}, [allIds])
```

```tsx
const handleNavigate = useCallback((item: T, index: number) => {
  ...
  if (multiSelectEnabled && isMultiSelectActive) {
    clearSelection()
  }

  setSelectionState(MultiSelect.singleSelect(id, index))
  keyboardOpts?.onNavigate?.(item, index)
}, [...])
```

```tsx
const handleExtendSelection = useCallback((toIndex: number) => {
  if (multiSelectEnabled) {
    range(toIndex)
  }
}, [multiSelectEnabled, range])
```

```tsx
const {
  activeIndex,
  setActiveIndex,
  getItemProps,
  getContainerProps,
  focusActiveItem,
} = useRovingTabIndex({
  items,
  getId: (item) => getId(item),
  orientation: 'vertical',
  wrap: true,
  onNavigate: handleNavigate,
  onActivate: handleActivate,
  enabled: keyboardOpts?.enabled ?? true,
  moveFocus: !(keyboardOpts?.virtualFocus ?? false),
  onExtendSelection: multiSelectEnabled ? handleExtendSelection : undefined,
})
```

```tsx
const getRowMouseDown = useCallback((item: T, index: number) => {
  return (e: React.MouseEvent) => {
    const id = getId(item)

    if (e.button === 2) {
      if (multiSelectEnabled && isMultiSelectActive && !selectionState.selectedIds.has(id)) {
        toggle(id, index)
      }
      return
    }

    const isMetaKey = e.metaKey || e.ctrlKey
    const isShiftKey = e.shiftKey

    if (multiSelectEnabled && isMetaKey) {
      e.preventDefault()
      toggle(id, index)
      lastClickIndexRef.current = index
      return
    }

    if (multiSelectEnabled && isShiftKey) {
      e.preventDefault()
      range(index)
      return
    }

    setSelectionState(MultiSelect.singleSelect(id, index))
    lastClickIndexRef.current = index
    setActiveIndex(index)
  }
}, [getId, multiSelectEnabled, isMultiSelectActive, selectionState.selectedIds, toggle, range, setActiveIndex])
```

```tsx
const getRowProps = useCallback((item: T, index: number) => {
  const id = getId(item)
  const itemProps = getItemProps(item, index)
  const effectiveSelected = selectedIdOverride !== undefined
    ? selectedIdOverride
    : selectionState.selected
  const isSelected = multiSelectEnabled
    ? effectiveSelected === id
    : index === activeIndex
  const isInMultiSelect = multiSelectEnabled && isMultiSelectActive && selectionState.selectedIds.has(id)

  return {
    buttonProps: {
      id: itemProps.id,
      tabIndex: itemProps.tabIndex,
      ref: itemProps.ref,
      onKeyDown: itemProps.onKeyDown,
      onFocus: itemProps.onFocus,
      'aria-selected': itemProps['aria-selected'],
      role: itemProps.role,
    } as Record<string, unknown>,
    isSelected,
    isInMultiSelect,
    onMouseDown: getRowMouseDown(item, index),
  }
}, [...])
```

### Visual highlighting

**File:** `apps/electron/src/renderer/components/ui/entity-row.tsx`

```tsx
{/* Selection indicator bar */}
{(isSelected || isInMultiSelect) && (
  <div className="absolute left-0 inset-y-0 w-[2px] bg-accent" />
)}

<button
  ...
  className={cn(
    "entity-row-btn flex w-full items-start gap-2 pl-2 pr-4 py-3 text-left text-sm outline-none rounded-[8px]",
    "transition-[background-color] duration-75",
    (isSelected || isInMultiSelect)
      ? "bg-foreground/3"
      : "hover:bg-foreground/2",
    ...
  )}
>
```

### Important behavior notes

- Multi-select is considered active only when `selectedIds.size > 1`.
- `shift+click` / `shift+arrow` creates a **contiguous range** from the anchor to the target.
- The anchor is resilient to reordering because `rangeSelect` re-finds it by `anchorId` if the cached `anchorIndex` goes stale.
- Right-click on an unselected item during multi-select first adds it to the selection, then opens the batch context menu.
- The visual state is split into:
  - `isSelected` = active/focused row
  - `isInMultiSelect` = included in batch selection

That split is why the highlight feels contiguous instead of acting like a single-checkbox list.

### Porting notes for `ai-nexus`

If you only copy the row tint, you miss the anchor/range machinery. If you only copy the selection store, you miss the row-level visuals and context-menu behavior. This feature is a small machine made of:
- Jotai selection atom,
- pure range math,
- row prop derivation,
- modifier-aware `onMouseDown`,
- row visuals,
- batch context menu switching.

---

## 5) Keyboard Focus Zones (`useFocusZone`, Left/Right pane nav)

### Core focus-zone state machine

**File:** `apps/electron/src/renderer/context/FocusContext.tsx`

```tsx
export type FocusZoneId = 'sidebar' | 'navigator' | 'chat'
export type FocusIntent = 'keyboard' | 'click' | 'programmatic'

export interface FocusZoneOptions {
  intent?: FocusIntent
  moveFocus?: boolean
}

const ZONE_ORDER: FocusZoneId[] = ['sidebar', 'navigator', 'chat']
```

```tsx
const [focusState, setFocusState] = useState<FocusState>({
  zone: null,
  intent: null,
  shouldMoveDOMFocus: false,
})
const zonesRef = useRef<Map<FocusZoneId, FocusZone>>(new Map())

const registerZone = useCallback((zone: FocusZone) => {
  zonesRef.current.set(zone.id, zone)
}, [])

const unregisterZone = useCallback((id: FocusZoneId) => {
  zonesRef.current.delete(id)
}, [])
```

```tsx
const focusZone = useCallback((id: FocusZoneId, options?: FocusZoneOptions) => {
  const zone = zonesRef.current.get(id)
  if (!zone) return

  const intent = options?.intent ?? 'programmatic'
  const shouldMoveFocus = options?.moveFocus ?? (intent === 'keyboard' || intent === 'programmatic')

  setFocusState({
    zone: id,
    intent,
    shouldMoveDOMFocus: shouldMoveFocus,
  })

  setCurrentZone(id)

  if (shouldMoveFocus) {
    if (zone.focusFirst) {
      zone.focusFirst()
    } else if (zone.ref.current) {
      zone.ref.current.focus()
    }
    setTimeout(() => {
      setFocusState(prev => ({ ...prev, shouldMoveDOMFocus: false }))
    }, 0)
  }
}, [])
```

```tsx
const focusNextZone = useCallback(() => {
  const currentIndex = focusState.zone ? ZONE_ORDER.indexOf(focusState.zone) : -1
  const nextIndex = (currentIndex + 1) % ZONE_ORDER.length
  focusZone(ZONE_ORDER[nextIndex], { intent: 'keyboard', moveFocus: true })
}, [focusState.zone, focusZone])

const focusPreviousZone = useCallback(() => {
  const currentIndex = focusState.zone ? ZONE_ORDER.indexOf(focusState.zone) : 0
  const prevIndex = (currentIndex - 1 + ZONE_ORDER.length) % ZONE_ORDER.length
  focusZone(ZONE_ORDER[prevIndex], { intent: 'keyboard', moveFocus: true })
}, [focusState.zone, focusZone])
```

### `useFocusZone` hook

**File:** `apps/electron/src/renderer/hooks/keyboard/useFocusZone.ts`

```tsx
export function useFocusZone({
  zoneId,
  onFocus,
  onBlur,
  focusFirst,
  enabled = true,
}: UseFocusZoneOptions): UseFocusZoneReturn {
  const zoneRef = useRef<HTMLDivElement>(null)
  const { registerZone, unregisterZone, focusZone, isZoneFocused, focusState } = useFocusContext()

  const isFocused = enabled && isZoneFocused(zoneId)
  const shouldMoveDOMFocus = enabled && focusState.zone === zoneId && focusState.shouldMoveDOMFocus
  const intent = focusState.zone === zoneId ? focusState.intent : null

  const wasFocusedRef = useRef(isFocused)

  useEffect(() => {
    if (!enabled) {
      unregisterZone(zoneId)
      return
    }

    if (zoneRef.current) {
      zoneRef.current.setAttribute('data-focus-zone', zoneId)
    }

    registerZone({
      id: zoneId,
      ref: zoneRef as React.RefObject<HTMLElement>,
      focusFirst,
    })

    return () => {
      unregisterZone(zoneId)
    }
  }, [zoneId, registerZone, unregisterZone, focusFirst, enabled])

  useEffect(() => {
    if (isFocused && !wasFocusedRef.current) {
      onFocus?.()
    } else if (!isFocused && wasFocusedRef.current) {
      onBlur?.()
    }
    wasFocusedRef.current = isFocused
  }, [isFocused, onFocus, onBlur])

  const focus = useCallback((options?: FocusZoneOptions) => {
    focusZone(zoneId, options)
  }, [focusZone, zoneId])

  return {
    zoneRef,
    isFocused,
    shouldMoveDOMFocus,
    intent,
    focus,
  }
}
```

### Session list uses the navigator zone

**File:** `apps/electron/src/renderer/components/app-shell/SessionList.tsx`

```tsx
const { focusZone } = useFocusContext()
const { zoneRef, isFocused, shouldMoveDOMFocus } = useFocusZone({ zoneId: 'navigator' })

const isKeyboardEligible = isFocused || (searchActive && isSearchInputFocused)
```

```tsx
useEffect(() => {
  if (shouldMoveDOMFocus && flatRows.length > 0 && !(searchActive ?? false)) {
    interactions.keyboard.focusActiveItem()
  }
}, [shouldMoveDOMFocus, flatRows.length, searchActive, interactions.keyboard])
```

```tsx
const handleKeyDown = useCallback((e: React.KeyboardEvent, _item: SessionMeta) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    focusZone('sidebar', { intent: 'keyboard' })
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    focusZone('chat', { intent: 'keyboard' })
    return
  }
}, [focusZone])
```

```tsx
const handleFocusZone = useCallback(() => focusZone('navigator', { intent: 'click', moveFocus: false }), [focusZone])
```

```tsx
<EntityList<SessionListRow>
  ...
  viewportRef={scrollViewportRef}
  containerRef={zoneRef}
  containerProps={{
    'data-focus-zone': 'navigator',
    role: 'listbox',
    'aria-label': 'Sessions',
  }}
/>
```

### `SessionItem` forwards arrow keys into zone logic

**File:** `apps/electron/src/renderer/components/app-shell/SessionItem.tsx`

```tsx
buttonProps={{
  ...itemProps,
  onKeyDown: (e: React.KeyboardEvent) => {
    ;(itemProps as { onKeyDown: (event: React.KeyboardEvent) => void }).onKeyDown(e)
    ctx.onKeyDown(e, item)
  },
}}
```

### Sidebar and chat register sibling zones

**File:** `apps/electron/src/renderer/components/app-shell/AppShell.tsx`

```tsx
const { focusZone, focusNextZone, focusPreviousZone } = useFocusContext()
const { zoneRef: sidebarRef, isFocused: sidebarFocused } = useFocusZone({ zoneId: 'sidebar' })

useAction('nav.focusSidebar', () => focusZone('sidebar', { intent: 'keyboard' }))
useAction('nav.focusNavigator', () => focusZone('navigator', { intent: 'keyboard' }))
useAction('nav.focusChat', () => focusZone('chat', { intent: 'keyboard' }))

useAction('nav.nextZone', () => {
  focusNextZone()
}, { enabled: () => !document.querySelector('[role="dialog"]') })
```

**File:** `apps/electron/src/renderer/components/app-shell/ChatDisplay.tsx`

```tsx
const { zoneRef, isFocused } = useFocusZone({
  zoneId: 'chat',
  enabled: isFocusedPanel,
  focusFirst: () => {
    if (isFocusedPanelRef.current) {
      textareaRef.current?.focus()
    }
  },
})
```

### What this does

- Focus is tracked as an app-level logical zone: `sidebar -> navigator -> chat`.
- Zone changes carry an **intent** (`keyboard`, `click`, `programmatic`), which determines whether actual DOM focus should move.
- Left/right arrows are not generic browser focus handling; they are explicit calls to `focusZone(...)`.
- `useFocusZone` stamps `data-focus-zone` on the container, which other parts of the keybinding system use to infer active zone.
- The navigator zone can stay logically focused even when the search input holds DOM focus.

### Porting notes for `ai-nexus`

This is not just a hook. It is a small focus architecture:
- `FocusProvider` context,
- zone registration/unregistration,
- intent-aware focus transitions,
- DOM-focus consumption via `shouldMoveDOMFocus`,
- per-pane `useFocusZone(...)`,
- row-level `onKeyDown` forwarding.

If `ai-nexus` only copies `ArrowLeft` / `ArrowRight` handlers without the zone state machine, it will feel brittle and half-alive.

---

## Cross-feature dependency map

### Session item is the visual convergence point

`SessionItem.tsx` is where these features meet:
- activity icons
- search-count badge
- label badges
- multi-select click behavior
- keyboard routing into focus-zone navigation

### Session list is the orchestration layer

`SessionList.tsx` supplies:
- selection store hooks
- `contentSearchResults`
- `activeChatMatchInfo`
- `hasPendingPrompt`
- flattened label config
- `focusZone` handlers
- row props from `useEntityListInteractions`

### Shared infra underneath

- `useMultiSelect.ts` = pure selection math
- `useEntitySelection.ts` = atom-backed store factory
- `useEntityListInteractions.ts` = row prop derivation + modifier handling + keyboard extension
- `FocusContext.tsx` + `useFocusZone.ts` = pane focus system
- `EntityRow.tsx` = selected / multi-selected visuals
- `EntityListLabelBadge.tsx` = colored label-pill UI

---

## Minimal implementation checklist for `ai-nexus`

If you want feature parity instead of a cosmetic imitation, these are the minimum pieces to port:

1. **Activity/state indicators**
   - indicator wrapper animation
   - spinner
   - unread meta glyph
   - plan triangle
   - pending prompt shield
   - shell-level pending-permission lookup

2. **Search badges**
   - `contentSearchResults` map
   - active-chat live count override
   - yellow `titleTrailing` pill
   - match-count-aware search sorting

3. **Label badges**
   - flattened label config tree
   - `SessionBadges`
   - `EntityListLabelBadge`
   - click-without-row-selection behavior

4. **Multi-select**
   - atom-backed selection store
   - anchor/range selection math
   - modifier-aware row `onMouseDown`
   - `isSelected` vs `isInMultiSelect`
   - left accent bar + tinted row background

5. **Focus zones**
   - `FocusProvider`
   - `useFocusZone`
   - zone registration with `data-focus-zone`
   - logical focus intent handling
   - ArrowLeft / ArrowRight pane navigation
   - navigator zone + chat zone + sidebar zone cooperation

---

## Bottom line

The missing Craft behavior is not hiding in one magic file. It is spread across:
- `SessionItem.tsx` for rendering,
- `SessionList.tsx` for orchestration,
- `SessionBadges.tsx` and `entity-list-label-badge.tsx` for labels,
- `useMultiSelect.ts` + `useEntitySelection.ts` + `useEntityListInteractions.ts` for batch selection,
- `FocusContext.tsx` + `useFocusZone.ts` for pane focus.

That’s the full little rat-king of wires. Pull only one strand and the rest won’t twitch correctly.
