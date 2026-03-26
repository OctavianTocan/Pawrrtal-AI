"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	ContextMenuItem,
	ContextMenuSeparator,
} from "@/components/ui/context-menu";

type MenuComponents = {
	MenuItem: typeof DropdownMenuItem | typeof ContextMenuItem;
	MenuSeparator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator;
};

const MenuComponentsContext = createContext<MenuComponents | null>(null);

export function useMenuComponents() {
	const ctx = useContext(MenuComponentsContext);
	if (!ctx) {
		throw new Error("useMenuComponents must be used within a MenuProvider");
	}
	return ctx;
}

export function DropdownMenuProvider({ children }: { children: ReactNode }) {
	return (
		<MenuComponentsContext.Provider
			value={{
				MenuItem: DropdownMenuItem,
				MenuSeparator: DropdownMenuSeparator,
			}}
		>
			{children}
		</MenuComponentsContext.Provider>
	);
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
	return (
		<MenuComponentsContext.Provider
			value={{
				MenuItem: ContextMenuItem,
				MenuSeparator: ContextMenuSeparator,
			}}
		>
			{children}
		</MenuComponentsContext.Provider>
	);
}
