"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent,
} from "@/components/ui/context-menu";

type MenuComponents = {
	MenuItem: typeof DropdownMenuItem | typeof ContextMenuItem;
	MenuSeparator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator;
	MenuSub: typeof DropdownMenuSub | typeof ContextMenuSub;
	MenuSubTrigger: typeof DropdownMenuSubTrigger | typeof ContextMenuSubTrigger;
	MenuSubContent:
		| typeof DropdownMenuSubContent
		| typeof ContextMenuSubContent;
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
				MenuSub: DropdownMenuSub,
				MenuSubTrigger: DropdownMenuSubTrigger,
				MenuSubContent: DropdownMenuSubContent,
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
				MenuSub: ContextMenuSub,
				MenuSubTrigger: ContextMenuSubTrigger,
				MenuSubContent: ContextMenuSubContent,
			}}
		>
			{children}
		</MenuComponentsContext.Provider>
	);
}
