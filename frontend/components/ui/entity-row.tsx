"use client";

import type * as React from "react";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
} from "@/components/ui/context-menu";
import {
	DropdownMenuProvider,
	ContextMenuProvider,
} from "@/components/ui/menu-context";
import { cn } from "@/lib/utils";

export interface EntityRowProps {
	icon?: React.ReactNode;
	title: React.ReactNode;
	titleClassName?: string;
	titleTrailing?: React.ReactNode;
	badges?: React.ReactNode;
	trailing?: React.ReactNode;
	children?: React.ReactNode;
	isSelected?: boolean;
	showSeparator?: boolean;
	className?: string;
	separatorClassName?: string;
	onClick?: () => void;
	/** Menu content rendered in both dropdown and context menu via providers */
	menuContent?: React.ReactNode;
	/** Override context menu content (defaults to menuContent) */
	contextMenuContent?: React.ReactNode;
	/** Multi-select highlight */
	isInMultiSelect?: boolean;
	/** Mouse down handler for modifier key detection */
	onMouseDown?: (e: React.MouseEvent) => void;
	/** Props spread onto the button element */
	buttonProps?: Record<string, unknown>;
	/** Data attributes on outer wrapper */
	dataAttributes?: Record<string, string | undefined>;
	/** Hide the "..." more button */
	hideMoreButton?: boolean;
}

/**
 * Generic interactive row used throughout the sidebar.
 *
 * Supports an icon, title, trailing content, badges, dropdown menu,
 * context menu, multi-select, and separator. Both the `titleTrailing`
 * and default layout variants provide a "..." overflow menu that
 * appears on hover and is keyboard-accessible.
 */
export function EntityRow({
	icon,
	title,
	titleClassName,
	titleTrailing,
	badges,
	trailing,
	children,
	isSelected = false,
	showSeparator = false,
	className,
	separatorClassName = "pl-[38px] pr-4",
	onClick,
	menuContent,
	contextMenuContent,
	isInMultiSelect = false,
	onMouseDown,
	buttonProps,
	dataAttributes,
	hideMoreButton = false,
}: EntityRowProps): React.JSX.Element {
	const [menuOpen, setMenuOpen] = useState(false);
	const [contextMenuOpen, setContextMenuOpen] = useState(false);
	const resolvedContextMenu = contextMenuContent ?? menuContent;
	const showMenuButton = Boolean(menuContent && !hideMoreButton);

	const renderMoreButton = (className: string, iconClassName: string) => (
		<DropdownMenu modal={true} onOpenChange={setMenuOpen}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={className}
					onPointerDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
					aria-label="More actions"
				>
					<MoreHorizontal className={iconClassName} />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuProvider>{menuContent}</DropdownMenuProvider>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const innerContent = (
		<div className="relative group select-none pl-2 mr-2">
			{(isSelected || isInMultiSelect) && (
				<div className="absolute left-0 inset-y-0 w-[2px] bg-accent" />
			)}
			<button
				type="button"
				{...(buttonProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
				onClick={!onMouseDown ? onClick : undefined}
				onMouseDown={onMouseDown}
				className={cn(
					"flex w-full items-start gap-2 pl-2 py-3 text-left text-sm outline-none rounded-[8px]",
					"transition-[background-color] duration-75",
					showMenuButton ? "pr-10" : "pr-4",
					isSelected || isInMultiSelect
						? "bg-foreground/3"
						: "hover:bg-foreground/2",
					(buttonProps as Record<string, unknown>)?.className as
						| string
						| undefined,
				)}
			>
				<div className="flex flex-col gap-1.5 min-w-0 flex-1">
					{titleTrailing ? (
						<div className="flex items-center gap-[10px] w-full min-w-0">
							{icon && (
								<div className="shrink-0 flex items-center gap-[10px] [&>*]:w-3 [&>*]:h-3">
									{icon}
								</div>
							)}
							<div
								className={cn(
									"font-sans truncate min-w-0 flex-1",
									titleClassName,
								)}
							>
								{title}
							</div>
							<div
								className={cn(
									"shrink-0 whitespace-nowrap transition-opacity",
									showMenuButton &&
										(menuOpen || contextMenuOpen
											? "opacity-0"
											: "group-hover:opacity-0"),
								)}
							>
								{titleTrailing}
							</div>
						</div>
					) : (
						<div
							className={cn(
								"flex items-center gap-[10px] w-full min-w-0",
								icon && "pr-6",
							)}
						>
							{icon && (
								<div className="shrink-0 flex items-center gap-[10px] [&>*]:w-3 [&>*]:h-3">
									{icon}
								</div>
							)}
							<div
								className={cn(
									"font-medium font-sans line-clamp-2 min-w-0 -mb-[2px]",
									titleClassName,
								)}
							>
								{title}
							</div>
						</div>
					)}
					{(badges || trailing) && (
						<div className="flex items-center gap-[10px] text-xs text-foreground/70 w-full -mb-[2px] min-w-0">
							{icon && (
								<div
									className="shrink-0 flex items-center gap-[10px] [&>*]:w-3 [&>*]:h-3 invisible"
									aria-hidden="true"
								>
									{icon}
								</div>
							)}
							{badges && (
								<div
									className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide"
									style={{
										maskImage:
											"linear-gradient(to right, black calc(100% - 16px), transparent 100%)",
										WebkitMaskImage:
											"linear-gradient(to right, black calc(100% - 16px), transparent 100%)",
									}}
								>
									{badges}
								</div>
							)}
							{trailing && (
								<div className="shrink-0 flex items-center gap-1 ml-auto">
									{trailing}
								</div>
							)}
						</div>
					)}
				</div>
			</button>
			{children}
			{showMenuButton && titleTrailing && (
				<div
					className={cn(
						"absolute right-3 top-1/2 -translate-y-1/2 transition-opacity z-10",
						menuOpen || contextMenuOpen
							? "opacity-100"
							: "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
					)}
				>
					{renderMoreButton(
						"p-1 rounded-[6px] hover:bg-foreground/10 data-[state=open]:bg-foreground/10 cursor-pointer",
						"h-3.5 w-3.5 text-muted-foreground",
					)}
				</div>
			)}
			{showMenuButton && !titleTrailing && (
				<div
					className={cn(
						"absolute right-2 top-2 transition-opacity z-10",
						menuOpen || contextMenuOpen
							? "opacity-100"
							: "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
					)}
				>
					<div className="flex items-center rounded-[8px] overflow-hidden border border-transparent hover:border-border/50">
						{renderMoreButton(
							"p-1.5 hover:bg-foreground/10 data-[state=open]:bg-foreground/10 cursor-pointer",
							"h-4 w-4 text-muted-foreground",
						)}
					</div>
				</div>
			)}
		</div>
	);

	return (
		<div
			className={className}
			data-selected={isSelected || undefined}
			{...dataAttributes}
		>
			{showSeparator && (
				<div className={separatorClassName}>
					<Separator />
				</div>
			)}
			{resolvedContextMenu ? (
				<ContextMenu modal={true} onOpenChange={setContextMenuOpen}>
					<ContextMenuTrigger asChild>{innerContent}</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuProvider>{resolvedContextMenu}</ContextMenuProvider>
					</ContextMenuContent>
				</ContextMenu>
			) : (
				innerContent
			)}
		</div>
	);
}
