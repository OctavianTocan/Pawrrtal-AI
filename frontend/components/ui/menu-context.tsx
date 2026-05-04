'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent,
} from '@/components/ui/context-menu';

type MenuComponents = {
	MenuItem: typeof DropdownMenuItem | typeof ContextMenuItem;
	MenuSeparator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator;
	MenuSub: typeof DropdownMenuSub | typeof ContextMenuSub;
	MenuSubTrigger: typeof DropdownMenuSubTrigger | typeof ContextMenuSubTrigger;
	MenuSubContent: typeof DropdownMenuSubContent | typeof ContextMenuSubContent;
};

const MenuComponentsContext = createContext<MenuComponents | null>(null);

/**
 * Returns the polymorphic menu primitives (MenuItem, MenuSeparator, etc.)
 * provided by the nearest `DropdownMenuProvider` or `ContextMenuProvider`.
 *
 * This lets shared menu content render identically inside both a dropdown
 * and a context menu without duplicating the item tree.
 *
 * @throws If called outside a `MenuProvider`.
 */
export function useMenuComponents(): MenuComponents {
	const ctx = useContext(MenuComponentsContext);
	if (!ctx) {
		throw new Error('useMenuComponents must be used within a MenuProvider');
	}
	return ctx;
}

/** Provides dropdown-flavoured menu components to child menu content. */
export function DropdownMenuProvider({ children }: { children: ReactNode }): React.JSX.Element {
	return (
		<MenuComponentsContext.Provider
			value={{
				MenuItem: DropdownMenuItem,
				MenuSeparator: DropdownMenuSeparator,
				MenuSub: DropdownMenuSub,
				MenuSubTrigger: DropdownMenuSubTrigger,
				MenuSubContent: DropdownMenuSubContent,
			}}
		>
			{children}
		</MenuComponentsContext.Provider>
	);
}

/** Provides context-menu-flavoured menu components to child menu content. */
export function ContextMenuProvider({ children }: { children: ReactNode }): React.JSX.Element {
	return (
		<MenuComponentsContext.Provider
			value={{
				MenuItem: ContextMenuItem,
				MenuSeparator: ContextMenuSeparator,
				MenuSub: ContextMenuSub,
				MenuSubTrigger: ContextMenuSubTrigger,
				MenuSubContent: ContextMenuSubContent,
			}}
		>
			{children}
		</MenuComponentsContext.Provider>
	);
}
