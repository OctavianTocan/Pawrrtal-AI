export type MultiSelectState = {
  selected: string | null;
  selectedIds: Set<string>;
  anchorId: string | null;
  anchorIndex: number;
};

export function createInitialSelectionState(): MultiSelectState {
  return {
    selected: null,
    selectedIds: new Set<string>(),
    anchorId: null,
    anchorIndex: -1,
  };
}

export function singleSelect(id: string, index: number): MultiSelectState {
  return {
    selected: id,
    selectedIds: new Set([id]),
    anchorId: id,
    anchorIndex: index,
  };
}

export function toggleSelect(state: MultiSelectState, id: string, index: number): MultiSelectState {
  const nextIds = new Set(state.selectedIds);

  if (nextIds.has(id)) {
    if (nextIds.size <= 1) {
      return state;
    }

    nextIds.delete(id);
    return {
      selected: state.selected === id ? [...nextIds][0] ?? null : state.selected,
      selectedIds: nextIds,
      anchorId: id,
      anchorIndex: index,
    };
  }

  nextIds.add(id);
  return {
    selected: id,
    selectedIds: nextIds,
    anchorId: id,
    anchorIndex: index,
  };
}

export function rangeSelect(state: MultiSelectState, toIndex: number, items: string[]): MultiSelectState {
  if (items.length === 0) {
    return state;
  }

  const clampedIndex = Math.max(0, Math.min(toIndex, items.length - 1));

  let anchorIndex = clampedIndex;
  if (state.anchorIndex >= 0 && state.anchorIndex < items.length && items[state.anchorIndex] === state.anchorId) {
    anchorIndex = state.anchorIndex;
  } else if (state.anchorId) {
    const foundIndex = items.indexOf(state.anchorId);
    anchorIndex = foundIndex >= 0 ? foundIndex : clampedIndex;
  }

  const start = Math.min(anchorIndex, clampedIndex);
  const end = Math.max(anchorIndex, clampedIndex);
  const selectedIds = new Set<string>();

  for (let index = start; index <= end; index += 1) {
    const itemId = items[index];
    if (itemId) {
      selectedIds.add(itemId);
    }
  }

  const selectedId = items[clampedIndex] ?? state.selected;
  const anchorId = state.anchorId ?? items[anchorIndex] ?? selectedId;

  return {
    selected: selectedId,
    selectedIds,
    anchorId,
    anchorIndex,
  };
}

export function clearMultiSelect(state: MultiSelectState): MultiSelectState {
  if (!state.selected) {
    return createInitialSelectionState();
  }

  return {
    selected: state.selected,
    selectedIds: new Set([state.selected]),
    anchorId: state.selected,
    anchorIndex: state.anchorIndex,
  };
}

export function isMultiSelectActive(state: MultiSelectState): boolean {
  return state.selectedIds.size > 1;
}
