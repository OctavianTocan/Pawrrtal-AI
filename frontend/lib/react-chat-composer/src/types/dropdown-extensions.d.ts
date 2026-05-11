/**
 * Type augmentations for `@octavian-tocan/react-dropdown`.
 *
 * The package's public type surface (>=1.0.0) covers the core
 * `DropdownMenu` props but does not yet ship typings for the richer API
 * the chat composer uses: `align`, `asChild`, `renderItem`, and the
 * `DropdownSubmenu*` family. Pawrrtal's workspace fork of the package
 * forwards these props at runtime, and the upstream release pipeline is
 * tracking them — until that lands, this module augmentation surfaces the
 * extra props so consumers don't need to cast.
 */

import type { ComponentType, ReactNode } from 'react';

declare module '@octavian-tocan/react-dropdown' {
	/** Extra props supported by the workspace `DropdownMenu`. */
	interface DropdownMenuProps<T> {
		/** Horizontal alignment of the dropdown panel relative to the trigger. */
		align?: 'start' | 'center' | 'end';
		/** When true, the trigger is rendered as the child element (Radix pattern). */
		asChild?: boolean;
		/** Custom row renderer with access to the per-row `onSelect`. */
		renderItem?: (
			item: T,
			isSelected: boolean,
			onSelect: (item: T) => void,
		) => ReactNode;
	}

	/** Submenu container — provides nested dropdown context. */
	export const DropdownSubmenu: ComponentType<{ children?: ReactNode }>;

	/** Trigger row for a nested submenu. */
	export const DropdownSubmenuTrigger: ComponentType<{
		className?: string;
		children?: ReactNode;
	}>;

	/** Panel content for a nested submenu. */
	export const DropdownSubmenuContent: ComponentType<{
		className?: string;
		children?: ReactNode;
	}>;
}
