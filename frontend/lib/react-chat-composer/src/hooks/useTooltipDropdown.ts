'use client';

import { useRef, useState } from 'react';

/**
 * Duration in ms the closing guard stays active after a dropdown closes.
 *
 * Radix restores focus to the trigger inside a `useEffect` cleanup that fires
 * after browser paint. When `DropdownMenuContent` (or its `SubContent`) runs
 * an exit animation inside a Portal, Radix `Presence` keeps the content
 * mounted for ~150 ms, meaning the `FocusScope` cleanup fires at ~150 ms+.
 * Using 300 ms ensures the guard outlasts both the plain Content restore
 * (~16–30 ms) and the Portal SubContent restore (~150 ms+).
 */
const DROPDOWN_CLOSE_GUARD_MS = 300;

/** Return value of {@link useTooltipDropdown}. */
export interface UseTooltipDropdownReturn {
	/** Whether the dropdown is currently open. */
	menuOpen: boolean;
	/**
	 * Whether the tooltip should be open. Already accounts for `menuOpen` —
	 * returns `false` while the dropdown is open so the tooltip and dropdown
	 * never appear simultaneously.
	 */
	tooltipOpen: boolean;
	/** Pass to `DropdownMenu.onOpenChange`. */
	handleMenuOpenChange: (open: boolean) => void;
	/** Pass to `Tooltip.onOpenChange`. */
	handleTooltipOpenChange: (open: boolean) => void;
}

/**
 * Shared state + guard logic for a `<Tooltip>` that wraps a
 * `<DropdownMenuTrigger>`.
 *
 * Radix fires `Tooltip.onOpenChange(true)` with `data-state="instant-open"`
 * when focus returns to the trigger after the dropdown closes (via its
 * `FocusScope` cleanup). By the time that fires, `menuOpen` is already
 * `false`, so a plain state guard misses it. This hook uses a ref-backed
 * 300 ms timer to suppress the spurious open.
 *
 * @returns State + handlers to spread onto `<Tooltip>` and `<DropdownMenu>`.
 */
export function useTooltipDropdown(): UseTooltipDropdownReturn {
	const [menuOpen, setMenuOpen] = useState(false);
	const [tooltipOpen, setTooltipOpen] = useState(false);
	const isMenuClosingRef = useRef(false);
	const closingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	function handleMenuOpenChange(open: boolean): void {
		setMenuOpen(open);
		if (!open) {
			isMenuClosingRef.current = true;
			setTooltipOpen(false);
			clearTimeout(closingTimerRef.current);
			closingTimerRef.current = setTimeout(() => {
				isMenuClosingRef.current = false;
			}, DROPDOWN_CLOSE_GUARD_MS);
		}
	}

	function handleTooltipOpenChange(open: boolean): void {
		// Block tooltip while the dropdown is open or still in its closing
		// window (focus-return fires here with `data-state="instant-open"`).
		if (menuOpen || isMenuClosingRef.current) return;
		setTooltipOpen(open);
	}

	return {
		menuOpen,
		tooltipOpen: menuOpen ? false : tooltipOpen,
		handleMenuOpenChange,
		handleTooltipOpenChange,
	};
}
