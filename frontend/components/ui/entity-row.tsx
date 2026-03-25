"use client";

import type * as React from "react";
import { Separator } from "@/components/ui/separator";
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
	asChild?: boolean;
}

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
	asChild = false,
}: EntityRowProps) {
	const Comp = asChild ? ("div" as const) : ("button" as const);

	return (
		<div className={className} data-selected={isSelected || undefined}>
			{showSeparator && (
				<div className={separatorClassName}>
					<Separator />
				</div>
			)}
			<div className="relative group select-none pl-2 mr-2">
				{isSelected && (
					<div className="absolute left-0 inset-y-0 w-[2px] bg-accent" />
				)}
				<Comp
					className={cn(
						"flex w-full items-start gap-2 pl-2 pr-4 py-3 text-left text-sm outline-none rounded-[8px]",
						"transition-[background-color] duration-75",
						isSelected ? "bg-foreground/3" : "hover:bg-foreground/2",
					)}
				>
					<div className="flex flex-col gap-1.5 min-w-0 flex-1">
						{titleTrailing ? (
							<div className="flex items-center gap-[10px] w-full min-w-0">
								{icon && (
									<div className="shrink-0 flex items-center gap-[10px] [&>*]:w-3.5 [&>*]:h-3.5">
										{icon}
									</div>
								)}
								<div className={cn("font-sans truncate min-w-0", titleClassName)}>
									{title}
								</div>
								<div className="shrink-0 ml-auto relative -mr-1">
									{titleTrailing}
								</div>
							</div>
						) : (
							<div className="flex items-center gap-[10px] w-full pr-6 min-w-0">
								{icon && (
									<div className="shrink-0 flex items-center gap-[10px] [&>*]:w-3.5 [&>*]:h-3.5">
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
										className="shrink-0 flex items-center gap-[10px] [&>*]:w-3.5 [&>*]:h-3.5 invisible"
										aria-hidden="true"
									>
										{icon}
									</div>
								)}
								{badges && (
									<div className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide">
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
				</Comp>
				{children}
			</div>
		</div>
	);
}
