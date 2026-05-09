# Craft resizable multi-panel app shell: extracted code + analysis

Source tree analyzed: `apps/electron/src/renderer` in `~/.openclaw/workspace/_local/pawrrtal-craft-source`

This document extracts the exact components and logic Craft uses for its split-pane shell. The important bit: Craft does **not** use a single static CSS grid for the whole app. It combines:

- **fixed-width left rails** managed directly in `AppShell.tsx`
- a **horizontal content panel stack** managed by Jotai atoms + flex proportions
- **drag sashes** that convert DOM-measured pixel widths into updated flex proportions
- a **compact/mobile mode** driven by `useContainerWidth`

---

## 1) Top-level composition: `AppShell.tsx`

The shell is composed as:

- **Left sidebar** → fixed px width (`sidebarWidth`)
- **Navigator / Session list** → fixed px width (`sessionListWidth`)
- **Main content panel(s)** → proportional flex layout inside `PanelStackContainer`

### Core shell state

```tsx
const [isSidebarVisible, setIsSidebarVisible] = React.useState(() => {
  return storage.get(storage.KEYS.sidebarVisible, !defaultCollapsed)
})
const [sidebarWidth, setSidebarWidth] = React.useState(() => {
  return storage.get(storage.KEYS.sidebarWidth, 220)
})
// Session list width in pixels (min 240, max 480)
const [sessionListWidth, setSessionListWidth] = React.useState(() => {
  return storage.get(storage.KEYS.sessionListWidth, 300)
})

const [isSidebarAndNavigatorHidden, setIsSidebarAndNavigatorHidden] = React.useState(() => {
  return isFocusedMode || storage.get(storage.KEYS.focusModeEnabled, false)
})
```

### Auto-compact / mobile collapse

This is how Craft switches to single-panel mode on narrow widths:

```tsx
const shellRef = useRef<HTMLDivElement>(null)
const shellWidth = useContainerWidth(shellRef)
const MOBILE_THRESHOLD = 768
const isAutoCompact = shellWidth > 0 && shellWidth < MOBILE_THRESHOLD

const effectiveSidebarAndNavigatorHidden = isSidebarAndNavigatorHidden || isAutoCompact
```

### Shell composition with `PanelStackContainer`

This is the key composition point. `PanelStackContainer` receives the left sidebar slot, navigator slot, and content panel stack.

```tsx
<div
  ref={shellRef}
  className="flex items-stretch relative"
  style={{ height: '100%', paddingRight: PANEL_EDGE_INSET, paddingBottom: PANEL_EDGE_INSET, paddingLeft: 0, gap: PANEL_GAP }}
>
  <PanelStackContainer
    sidebarSlot={
      <div
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
        className="h-full font-sans relative"
        data-focus-zone="sidebar"
        tabIndex={sidebarFocused ? 0 : -1}
        onKeyDown={handleSidebarKeyDown}
      >
        ...
        <LeftSidebar ... />
      </div>
    }
    sidebarWidth={effectiveSidebarAndNavigatorHidden ? 0 : (isSidebarVisible ? sidebarWidth : 0)}
    navigatorSlot={
      <div
        style={{ width: isAutoCompact ? '100%' : sessionListWidth }}
        className="h-full flex flex-col min-w-0 relative z-panel"
      >
        ...
        <SessionList ... />
      </div>
    }
    navigatorWidth={isAutoCompact ? sessionListWidth : (effectiveSidebarAndNavigatorHidden ? 0 : sessionListWidth)}
    isSidebarAndNavigatorHidden={effectiveSidebarAndNavigatorHidden}
    isRightSidebarVisible={false}
    isCompact={isAutoCompact}
    isResizing={!!isResizing}
  />
```

### What this means structurally

Craft’s effective layout is:

```text
[ LeftSidebar px width ] [ SessionList/Navigator px width ] [ PanelStack flex panels... ]
```

Notably:

- the **sidebar** and **session list** are **not** part of the proportional content-panel flex math
- only the **main content area** is split into panel proportions
- compact mode can hide sidebar/navigator and show either list or content

---

## 2) The resizable left rails in `AppShell.tsx`

Craft has **two absolute resize handles** in `AppShell.tsx`:

- one for the **sidebar**
- one for the **session list**

### Resize state

```tsx
const [isResizing, setIsResizing] = React.useState<'sidebar' | 'session-list' | null>(null)
const [sidebarHandleY, setSidebarHandleY] = React.useState<number | null>(null)
const [sessionListHandleY, setSessionListHandleY] = React.useState<number | null>(null)
const resizeHandleRef = React.useRef<HTMLDivElement>(null)
const sessionListHandleRef = React.useRef<HTMLDivElement>(null)
```

### Drag logic for sidebar + session list

This is the exact mousemove math Craft uses:

```tsx
React.useEffect(() => {
  if (!isResizing) return

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing === 'sidebar') {
      const newWidth = Math.min(Math.max(e.clientX, 180), 320)
      setSidebarWidth(newWidth)
      if (resizeHandleRef.current) {
        const rect = resizeHandleRef.current.getBoundingClientRect()
        setSidebarHandleY(e.clientY - rect.top)
      }
    } else if (isResizing === 'session-list') {
      const offset = isSidebarVisible ? sidebarWidth : 0
      const newWidth = Math.min(Math.max(e.clientX - offset, 240), 480)
      setSessionListWidth(newWidth)
      if (sessionListHandleRef.current) {
        const rect = sessionListHandleRef.current.getBoundingClientRect()
        setSessionListHandleY(e.clientY - rect.top)
      }
    }
  }

  const handleMouseUp = () => {
    if (isResizing === 'sidebar') {
      storage.set(storage.KEYS.sidebarWidth, sidebarWidth)
      setSidebarHandleY(null)
    } else if (isResizing === 'session-list') {
      storage.set(storage.KEYS.sessionListWidth, sessionListWidth)
      setSessionListHandleY(null)
    }
    setIsResizing(null)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  return () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}, [
  isResizing,
  sidebarWidth,
  sessionListWidth,
  isSidebarVisible,
])
```

### The actual constraints

- **Sidebar width**: clamped to `180..320`
- **Session list width**: clamped to `240..480`
- session-list drag subtracts sidebar width when sidebar is visible:
  - `e.clientX - offset`

That means the navigator sash is positioned in **window coordinates**, but the final width is computed relative to the left rail already occupying space.

### The two absolute sash elements

#### Sidebar sash

```tsx
<div
  ref={resizeHandleRef}
  onMouseDown={(e) => { e.preventDefault(); setIsResizing('sidebar') }}
  onMouseMove={(e) => {
    if (resizeHandleRef.current) {
      const rect = resizeHandleRef.current.getBoundingClientRect()
      setSidebarHandleY(e.clientY - rect.top)
    }
  }}
  onMouseLeave={() => { if (!isResizing) setSidebarHandleY(null) }}
  className="absolute cursor-col-resize z-panel flex justify-center"
  style={{
    width: PANEL_SASH_HIT_WIDTH,
    top: PANEL_STACK_VERTICAL_OVERFLOW,
    bottom: PANEL_STACK_VERTICAL_OVERFLOW,
    left: isSidebarVisible
      ? sidebarWidth + (PANEL_GAP / 2) - PANEL_SASH_HALF_HIT_WIDTH
      : -PANEL_GAP,
    transition: isResizing === 'sidebar' ? undefined : 'left 0.15s ease-out',
  }}
>
  <div
    className="h-full"
    style={{
      ...getResizeGradientStyle(sidebarHandleY, resizeHandleRef.current?.clientHeight ?? null),
      width: PANEL_SASH_LINE_WIDTH,
    }}
  />
</div>
```

#### Session-list sash

```tsx
<div
  ref={sessionListHandleRef}
  onMouseDown={(e) => { e.preventDefault(); setIsResizing('session-list') }}
  onMouseMove={(e) => {
    if (sessionListHandleRef.current) {
      const rect = sessionListHandleRef.current.getBoundingClientRect()
      setSessionListHandleY(e.clientY - rect.top)
    }
  }}
  onMouseLeave={() => { if (isResizing !== 'session-list') setSessionListHandleY(null) }}
  className="absolute cursor-col-resize z-panel flex justify-center"
  style={{
    width: PANEL_SASH_HIT_WIDTH,
    top: PANEL_STACK_VERTICAL_OVERFLOW,
    bottom: PANEL_STACK_VERTICAL_OVERFLOW,
    left:
      (isSidebarVisible ? sidebarWidth + PANEL_GAP : PANEL_EDGE_INSET) +
      sessionListWidth +
      (PANEL_GAP / 2) -
      PANEL_SASH_HALF_HIT_WIDTH,
    transition: isResizing === 'session-list' ? undefined : 'left 0.15s ease-out',
  }}
>
  <div
    className="h-full"
    style={{
      ...getResizeGradientStyle(sessionListHandleY, sessionListHandleRef.current?.clientHeight ?? null),
      width: PANEL_SASH_LINE_WIDTH,
    }}
  />
</div>
```

### Why this is not a simple CSS layout

The shell rails are positioned by:

- persisted React state (`sidebarWidth`, `sessionListWidth`)
- absolute seam math using `PANEL_GAP`, `PANEL_EDGE_INSET`, and sash hit widths
- document-level drag listeners
- visual gradient tracking via pointer Y

So the shell is interactive, stateful, and geometry-driven rather than static.

---

## 3) `useContainerWidth.ts`: compact-mode width observer

This hook is tiny but central to Craft’s responsive shell.

```tsx
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentBoxSize[0].inlineSize)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return width
}
```

### Purpose

`AppShell.tsx` uses this width to determine:

- when to collapse sidebar + navigator automatically
- when to switch from a multi-column shell to compact list/content behavior

---

## 4) The real multi-panel engine: `PanelStackContainer.tsx`

This file is the actual split-pane content layout engine.

### High-level comment from the file

```tsx
/**
 * Horizontal layout container for ALL panels:
 * Sidebar → Navigator → Content Panel(s) with resize sashes.
 *
 * Content panels use CSS flex-grow with their proportions as weights:
 * - Each panel gets `flex: <proportion> 1 0px` with `min-width: PANEL_MIN_WIDTH`
 * - Flex distributes available space proportionally — panels fill the viewport
 * - When panels hit min-width, overflow-x: auto kicks in naturally
 *
 * Sidebar and Navigator are NOT part of the proportional layout —
 * they have their own fixed/user-resizable widths managed by AppShell.
 */
```

That comment is dead-on: the split-pane system only governs **content panels**.

### Important derived layout flags

```tsx
const panelStack = useAtomValue(panelStackAtom)
const focusedPanelId = useAtomValue(focusedPanelIdAtom)
const focusedSessionId = useAtomValue(focusedSessionIdAtom)

const contentPanels = panelStack

const hasSelectedContent = isCompact && !!focusedSessionId
const visiblePanels = isCompact
  ? contentPanels.filter(e => e.id === focusedPanelId).slice(0, 1)
  : contentPanels

const hasSidebar = sidebarWidth > 0
const hasNavigator = isCompact ? (navigatorWidth > 0 && !hasSelectedContent) : navigatorWidth > 0
const isMultiPanel = visiblePanels.length > 1
const isLeftEdge = !hasSidebar && !hasNavigator
```

### Compact mode behavior

In compact mode, Craft shows **either**:

- navigator/list, or
- the focused content panel

not both.

This is the key toggle:

```tsx
const hasSelectedContent = isCompact && !!focusedSessionId
```

### Auto-scroll when a new panel is pushed

```tsx
useEffect(() => {
  if (contentPanels.length > prevCountRef.current && scrollRef.current) {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      })
    })
  }
  prevCountRef.current = contentPanels.length
}, [contentPanels.length])
```

So the content strip itself is horizontally scrollable if panels overflow.

### Animated shell slots

Sidebar slot:

```tsx
<motion.div
  data-panel-role="sidebar"
  initial={false}
  animate={{
    width: hasSidebar ? sidebarWidth : 0,
    marginRight: hasSidebar ? 0 : -PANEL_GAP,
    opacity: hasSidebar ? 1 : 0,
  }}
  transition={transition}
  className="h-full relative shrink-0"
  style={{ overflowX: 'clip', overflowY: 'visible' }}
>
  <div className="h-full" style={{ width: sidebarWidth }}>
    {sidebarSlot}
  </div>
</motion.div>
```

Navigator slot:

```tsx
<motion.div
  data-panel-role="navigator"
  initial={false}
  animate={{
    width: hasNavigator ? navigatorWidth : 0,
    marginRight: hasNavigator ? 0 : -PANEL_GAP,
    opacity: hasNavigator ? 1 : 0,
  }}
  transition={transition}
  className={cn(
    'h-full overflow-hidden relative shrink-0 z-[2]',
    'bg-background shadow-middle',
  )}
  style={{
    ...(isCompact && hasNavigator && !hasSelectedContent ? { flex: '1 1 auto' } : {}),
    borderTopLeftRadius: RADIUS_INNER,
    borderBottomLeftRadius: !hasSidebar ? RADIUS_EDGE : RADIUS_INNER,
    borderTopRightRadius: RADIUS_INNER,
    borderBottomRightRadius: RADIUS_INNER,
  }}
>
  <div className="h-full" style={{ width: isCompact && hasNavigator && !hasSelectedContent ? '100%' : navigatorWidth }}>
    {navigatorSlot}
  </div>
</motion.div>
```

### Rendering the content panel stack

```tsx
{visiblePanels.map((entry, index) => (
  <PanelSlot
    key={entry.id}
    entry={entry}
    isOnly={visiblePanels.length === 1}
    isFocusedPanel={isMultiPanel ? entry.id === focusedPanelId : true}
    isSidebarAndNavigatorHidden={isSidebarAndNavigatorHidden}
    isAtLeftEdge={index === 0 && isLeftEdge}
    isAtRightEdge={index === visiblePanels.length - 1 && !isRightSidebarVisible}
    proportion={entry.proportion}
    isCompact={isCompact}
    sash={index > 0 ? (
      <PanelResizeSash
        leftIndex={index - 1}
        rightIndex={index}
      />
    ) : undefined}
  />
))}
```

This is the exact split-pane chain:

- first content panel: no sash before it
- every later panel: gets a `PanelResizeSash` inserted before it

---

## 5) Individual content panels: `PanelSlot.tsx`

`PanelSlot` is where each main panel gets its **flex sizing contract**.

### The key sizing rule

```tsx
style={{
  ...(isOnly
    ? { flexGrow: 1, minWidth: 0 }
    : { flexGrow: proportion, flexShrink: 1, flexBasis: 0, minWidth: PANEL_MIN_WIDTH }
  ),
}}
```

### What that means

If there is only one panel:

- it just fills available space

If there are multiple panels:

- `flex-grow = proportion`
- `flex-basis = 0`
- `flex-shrink = 1`
- `min-width = PANEL_MIN_WIDTH`

So panel widths are not stored as pixels. They are stored as **weights**.

That weight is `entry.proportion` from the panel stack atom.

### Exact wrapper with focus styling and edge radii

```tsx
<div
  onPointerDown={handlePointerDown}
  data-panel-role="content"
  data-compact={isCompact || undefined}
  className={cn(
    'h-full overflow-hidden relative @container/panel',
    !isOnly && isFocusedPanel ? 'shadow-panel-focused z-[1]' : 'shadow-middle z-0',
    'bg-foreground-2',
  )}
  style={{
    ...(!isFocusedPanel && !isOnly
      ? {
          '--background': 'var(--background-elevated)',
          '--shadow-minimal': 'var(--shadow-minimal-flat)',
          '--user-message-bubble': 'var(--user-message-bubble-dimmed)',
        } as React.CSSProperties
      : {}
    ),
    borderTopLeftRadius: RADIUS_INNER,
    borderBottomLeftRadius: isAtLeftEdge ? RADIUS_EDGE : RADIUS_INNER,
    borderTopRightRadius: RADIUS_INNER,
    borderBottomRightRadius: isAtRightEdge ? RADIUS_EDGE : RADIUS_INNER,
    ...(isOnly
      ? { flexGrow: 1, minWidth: 0 }
      : { flexGrow: proportion, flexShrink: 1, flexBasis: 0, minWidth: PANEL_MIN_WIDTH }
    ),
  }}
>
```

### Panel focus behavior

Clicking a panel focuses it:

```tsx
const handlePointerDown = useCallback(() => {
  if (!isFocusedPanel) {
    setFocusedPanel(entry.id)
  }
}, [isFocusedPanel, setFocusedPanel, entry.id])
```

This matters because Craft’s compact mode and keyboard behavior key off the focused panel.

---

## 6) The drag sash between content panels: `PanelResizeSash.tsx`

This is the exact split-pane drag logic for the main content area.

### Core refs used during drag

```tsx
const startXRef = useRef(0)
const startLeftWidthRef = useRef(0)
const startRightWidthRef = useRef(0)
const combinedProportionRef = useRef(0)
```

### Exact drag algorithm

```tsx
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  e.preventDefault()
  handlers.onMouseDown()

  const sashEl = ref.current
  if (!sashEl) return

  const leftPanel = sashEl.previousElementSibling as HTMLElement | null
  const rightPanel = sashEl.nextElementSibling as HTMLElement | null
  if (!leftPanel || !rightPanel) return

  startXRef.current = e.clientX
  startLeftWidthRef.current = leftPanel.getBoundingClientRect().width
  startRightWidthRef.current = rightPanel.getBoundingClientRect().width

  const leftProp = panelStack[leftIndex]?.proportion ?? 0.5
  const rightProp = panelStack[rightIndex]?.proportion ?? 0.5
  combinedProportionRef.current = leftProp + rightProp

  const handleMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startXRef.current
    const combinedWidth = startLeftWidthRef.current + startRightWidthRef.current

    let newLeftWidth = startLeftWidthRef.current + delta
    let newRightWidth = startRightWidthRef.current - delta

    if (newLeftWidth < PANEL_MIN_WIDTH) {
      newLeftWidth = PANEL_MIN_WIDTH
      newRightWidth = combinedWidth - PANEL_MIN_WIDTH
    }
    if (newRightWidth < PANEL_MIN_WIDTH) {
      newRightWidth = PANEL_MIN_WIDTH
      newLeftWidth = combinedWidth - PANEL_MIN_WIDTH
    }

    const combined = combinedProportionRef.current
    const total = newLeftWidth + newRightWidth
    const leftProportion = (newLeftWidth / total) * combined
    const rightProportion = combined - leftProportion

    resizePanels({ leftIndex, rightIndex, leftProportion, rightProportion })
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }

  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}, [leftIndex, rightIndex, panelStack, resizePanels, handlers, ref])
```

### The important math

Craft’s panel-resize math works like this:

1. **Measure current pixel widths** of the left and right DOM siblings.
2. Compute pointer delta:
   - `delta = e.clientX - startX`
3. Apply delta:
   - `newLeftWidth = startLeftWidth + delta`
   - `newRightWidth = startRightWidth - delta`
4. Clamp both to `PANEL_MIN_WIDTH`.
5. Convert those pixels back into **relative proportions**, preserving the pair’s total proportion.

That conversion is the heart of the system:

```tsx
const combined = combinedProportionRef.current
const total = newLeftWidth + newRightWidth
const leftProportion = (newLeftWidth / total) * combined
const rightProportion = combined - leftProportion
```

### Why preserving combined proportion matters

If two adjacent panels previously had proportions:

- left = `0.3`
- right = `0.7`

then their combined share is `1.0`.

After dragging, Craft redistributes only that `1.0` between the two panels. It does **not** disturb other panels in the stack.

That gives local resizing behavior instead of recomputing the whole row.

### Double-click reset behavior

```tsx
const handleDoubleClick = useCallback(() => {
  const left = panelStack[leftIndex]
  const right = panelStack[rightIndex]
  if (!left || !right) return
  const combined = left.proportion + right.proportion
  const half = combined / 2
  resizePanels({
    leftIndex,
    rightIndex,
    leftProportion: half,
    rightProportion: half,
  })
}, [leftIndex, rightIndex, panelStack, resizePanels])
```

So double-click equalizes the two neighboring panels while keeping their total share stable.

### Sash rendering

```tsx
return (
  <div
    ref={ref}
    className="relative w-0 h-full cursor-col-resize flex justify-center shrink-0"
    style={{ margin: `0 ${PANEL_SASH_FLEX_MARGIN}px` }}
    onMouseDown={handleMouseDown}
    onMouseMove={handlers.onMouseMove}
    onMouseLeave={handlers.onMouseLeave}
    onDoubleClick={handleDoubleClick}
  >
    <div
      className="absolute inset-y-0 flex justify-center cursor-col-resize"
      style={{ left: -PANEL_SASH_HALF_HIT_WIDTH, right: -PANEL_SASH_HALF_HIT_WIDTH }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          ...gradientStyle,
          width: PANEL_SASH_LINE_WIDTH,
          top: PANEL_STACK_VERTICAL_OVERFLOW,
          bottom: PANEL_STACK_VERTICAL_OVERFLOW,
        }}
      />
    </div>
  </div>
)
```

The sash itself is `w-0`; the actual grab zone is an absolutely positioned hit area centered on the seam.

---

## 7) Resize visuals: `useResizeGradient.ts`

Craft uses the same gradient logic for:

- sidebar sash
- session-list sash
- content-panel sash

### Exact gradient math

```tsx
const RESIZE_GRADIENT_EDGE_BUFFER_PX = 64

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getResizeGradientStyle(
  mouseY: number | null,
  handleHeight: number | null,
): React.CSSProperties {
  if (mouseY === null || !handleHeight || handleHeight <= 0) {
    return {
      transition: 'opacity 150ms ease-out',
      opacity: 0,
      background: 'none',
    }
  }

  const height = handleHeight
  const edgeBuffer = Math.min(RESIZE_GRADIENT_EDGE_BUFFER_PX, Math.max(0, Math.floor(height / 2)))
  const centerY = clamp(mouseY, edgeBuffer, height - edgeBuffer)

  const nearCenterDelta = Math.max(20, Math.round(edgeBuffer * 0.22))
  const farCenterDelta = Math.max(56, Math.round(edgeBuffer * 0.75))

  const stopTopNear = clamp(centerY - nearCenterDelta, 0, height)
  const stopTopFar = clamp(centerY - farCenterDelta, 0, height)
  const stopBottomNear = clamp(centerY + nearCenterDelta, 0, height)
  const stopBottomFar = clamp(centerY + farCenterDelta, 0, height)

  return {
    transition: 'opacity 150ms ease-out',
    opacity: 1,
    background: `linear-gradient(
      to bottom,
      transparent 0px,
      color-mix(in oklch, var(--foreground) 10%, transparent) ${stopTopFar}px,
      color-mix(in oklch, var(--foreground) 18%, transparent) ${stopTopNear}px,
      color-mix(in oklch, var(--foreground) 36%, transparent) ${centerY}px,
      color-mix(in oklch, var(--foreground) 18%, transparent) ${stopBottomNear}px,
      color-mix(in oklch, var(--foreground) 10%, transparent) ${stopBottomFar}px,
      transparent ${height}px
    )`,
  }
}
```

### Interaction hook

```tsx
export function useResizeGradient() {
  const [mouseY, setMouseY] = React.useState<number | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const onMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setMouseY(e.clientY - rect.top)
    }
  }, [])

  const onMouseLeave = React.useCallback(() => {
    if (!isDragging) {
      setMouseY(null)
    }
  }, [isDragging])

  const onMouseDown = React.useCallback(() => {
    setIsDragging(true)
  }, [])

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setMouseY(e.clientY - rect.top)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setMouseY(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return {
    ref,
    mouseY,
    isDragging,
    handlers: { onMouseMove, onMouseLeave, onMouseDown },
    gradientStyle: getResizeGradientStyle(mouseY, ref.current?.clientHeight ?? null),
  }
}
```

This is purely visual, but it is part of why the sash feels alive instead of being a dead border.

---

## 8) Panel state and resize persistence: `atoms/panel-stack.ts`

The main content panel layout is stored in Jotai.

### Panel stack shape

```tsx
export interface PanelStackEntry {
  id: string
  route: ViewRoute
  proportion: number
  panelType: PanelType
  laneId: PanelLaneId
}

export const panelStackAtom = atom<PanelStackEntry[]>([])
export const focusedPanelIdAtom = atom<string | null>(null)
```

### Proportion normalization

Whenever panels are pushed/reconciled, proportions are normalized.

```tsx
function normalizeProportions(stack: PanelStackEntry[]): PanelStackEntry[] {
  if (stack.length === 0) return stack
  const total = stack.reduce((sum, p) => sum + p.proportion, 0)
  if (total <= 0) {
    const equal = 1 / stack.length
    return stack.map(p => ({ ...p, proportion: equal }))
  }
  return stack.map(p => ({ ...p, proportion: p.proportion / total }))
}
```

### Resize atom

This is the destination of `PanelResizeSash` drag updates:

```tsx
export const resizePanelsAtom = atom(
  null,
  (get, set, { leftIndex, rightIndex, leftProportion, rightProportion }: {
    leftIndex: number
    rightIndex: number
    leftProportion: number
    rightProportion: number
  }) => {
    const stack = get(panelStackAtom)
    if (leftIndex < 0 || rightIndex >= stack.length) return
    const newStack = stack.map((p, i) => {
      if (i === leftIndex) return { ...p, proportion: leftProportion }
      if (i === rightIndex) return { ...p, proportion: rightProportion }
      return p
    })
    set(panelStackAtom, newStack)
  }
)
```

Notice: during drag, Craft does **not** renormalize the entire stack. It just updates the two neighboring proportions. Since `PanelResizeSash` preserves the pair’s sum, the whole stack stays coherent.

### Focused session derivation

Compact mode depends on this derived session selection:

```tsx
export function parseSessionIdFromRoute(route: ViewRoute): string | null {
  const segments = route.split('/')
  const idx = segments.indexOf('session')
  if (idx >= 0 && idx + 1 < segments.length) {
    return segments[idx + 1]
  }
  return null
}

export const focusedSessionIdAtom = atom((get) => {
  const route = get(focusedPanelRouteAtom)
  if (!route) return null
  return parseSessionIdFromRoute(route)
})
```

That is how `PanelStackContainer` knows whether compact mode should show list or content.

---

## 9) `AppShellContext.tsx`: layout-related context behavior

`AppShellContext` is not directly doing the resize math, but it is part of how each panel behaves as an equal citizen in the shell.

### Relevant context fields

```tsx
export interface AppShellContextType {
  ...
  rightSidebarButton?: React.ReactNode
  leadingAction?: React.ReactNode
  isFocusedPanel?: boolean
  ...
}
```

### Provider use in `AppShell.tsx`

`AppShell` wraps the shell with:

```tsx
<AppShellProvider value={appShellContextValue}>
  ...
</AppShellProvider>
```

### Per-panel context override in `PanelSlot.tsx`

Each content panel overrides the context so `MainContentPanel` can render panel-specific controls and focus state.

```tsx
const contextOverride = useMemo(() => ({
  ...parentContext,
  rightSidebarButton: closeButton,
  leadingAction: backButton,
  isFocusedPanel,
}), [parentContext, closeButton, backButton, isFocusedPanel])

<AppShellProvider value={contextOverride}>
  <MainContentPanel
    navStateOverride={navState}
    isSidebarAndNavigatorHidden={isSidebarAndNavigatorHidden}
  />
</AppShellProvider>
```

So the shell is not just visual split panes; each pane also gets contextual behavior:

- close button
- compact-mode back button
- focused/unfocused styling state

---

## 10) Supporting layout constants: `panel-constants.ts`

These constants are used to keep all seams aligned.

```tsx
export const PANEL_GAP = 6
export const PANEL_EDGE_INSET = 6
export const RADIUS_EDGE = isMac ? 14 : 8
export const RADIUS_INNER = 10
export const PANEL_MIN_WIDTH = 440
export const PANEL_STACK_VERTICAL_OVERFLOW = 8
export const PANEL_SASH_HIT_WIDTH = 8
export const PANEL_SASH_LINE_WIDTH = 2
export const PANEL_SASH_FLEX_MARGIN = -(PANEL_GAP / 2)
export const PANEL_SASH_HALF_HIT_WIDTH = PANEL_SASH_HIT_WIDTH / 2
```

Two especially important ones:

- `PANEL_MIN_WIDTH = 440` for content panes
- `PANEL_SASH_FLEX_MARGIN = -(PANEL_GAP / 2)` so inserting a sash between flex items does not visually double the gap

---

## 11) Where the three main panes come from

If you want the exact top-level composition of the classic Craft shell, it is:

### Left pane: sidebar navigation

Implemented via `LeftSidebar` inside the `sidebarSlot`.

```tsx
<LeftSidebar
  isCollapsed={false}
  getItemProps={getSidebarItemProps}
  focusedItemId={focusedSidebarItemId}
  links={[ ... ]}
/>
```

### Middle pane: navigator / session list

Implemented by the `navigatorSlot`, typically with `SessionList` when in sessions navigation.

```tsx
{isSessionsNavigation(navState) && (
  <SessionList
    key={sessionFilter?.kind}
    items={searchActive ? workspaceSessionMetas : filteredSessionMetas}
    ...
  />
)}
```

### Right/main pane: chat/content panels

Implemented by `PanelStackContainer` rendering one or more `PanelSlot`s, each wrapping `MainContentPanel`, which in session routes includes `ChatDisplay`.

```tsx
<PanelSlot
  ...
>
```

Inside `PanelSlot`:

```tsx
<MainContentPanel
  navStateOverride={navState}
  isSidebarAndNavigatorHidden={isSidebarAndNavigatorHidden}
/>
```

And `ChatDisplay` is the actual chat pane UI used by the main content path.

---

## 12) Role of `WorkspaceSwitcher.tsx`

`WorkspaceSwitcher.tsx` is **not** part of the resize math. It is just a workspace dropdown trigger used in topbar/sidebar UI.

It matters to shell composition only in the sense that it is part of the surrounding app chrome, not the split-pane system.

There is **no drag-resize logic** in `WorkspaceSwitcher.tsx`.

---

## 13) Condensed architectural summary

### What actually implements Craft’s resizable app shell

**Fixed left rails**
- `AppShell.tsx`
  - `sidebarWidth`
  - `sessionListWidth`
  - absolute resize handles
  - document mouse listeners

**Responsive shell mode switching**
- `useContainerWidth.ts`
  - `ResizeObserver`
  - `isAutoCompact`

**Resizable content split panes**
- `PanelStackContainer.tsx`
  - arranges sidebar, navigator, and content panel strip
- `PanelSlot.tsx`
  - applies `flex-grow: proportion; flex-basis: 0; min-width: PANEL_MIN_WIDTH`
- `PanelResizeSash.tsx`
  - DOM width measurement + drag delta + proportion conversion

**State backing the split panes**
- `atoms/panel-stack.ts`
  - `panelStackAtom`
  - `focusedPanelIdAtom`
  - `resizePanelsAtom`
  - normalized proportions

**Per-panel behavior**
- `AppShellContext.tsx`
- `PanelSlot.tsx` context override for `isFocusedPanel`, close/back buttons

---

## 14) The key design trick Craft uses

The nastiest useful little trick in this whole beast:

- during drag, Craft measures panel widths in **pixels**
- but it stores layout in **proportions**
- and it preserves only the **combined proportion of the two adjacent panels**

That gives it:

- natural flexbox filling
- local resize behavior
- stable multi-panel layout
- horizontal overflow when min widths are hit
- no global layout explosion every time a sash moves

In short: **DOM pixels for input, flex proportions for state**. Clean knife-work.
