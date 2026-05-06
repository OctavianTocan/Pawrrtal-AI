'use client';

import { IconCheck, IconChevronRight } from '@tabler/icons-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
	return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
	return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
	return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
	className,
	align = 'start',
	sideOffset = 4,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				data-slot="dropdown-menu-content"
				sideOffset={sideOffset}
				align={align}
				className={cn(
					'data-[state=open]:animate-dropdown-open data-[state=closed]:animate-dropdown-close popover-styled w-fit font-sans whitespace-nowrap text-xs flex flex-col gap-0.5 min-w-40 p-1 z-50 max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto data-[state=closed]:overflow-hidden',
					className
				)}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	);
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
	return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
	className,
	inset,
	variant = 'default',
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
	inset?: boolean;
	variant?: 'default' | 'destructive';
}) {
	return (
		<DropdownMenuPrimitive.Item
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			className={cn(
				"focus:bg-foreground/[0.07] hover:bg-foreground/[0.07] data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive [&>svg:not([class*='text-'])]:text-muted-foreground gap-2 rounded-[6px] px-2 py-1.5 pr-4 text-sm data-inset:pl-9.5 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 group/dropdown-menu-item relative flex cursor-pointer items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			{...props}
		/>
	);
}

function DropdownMenuCheckboxItem({
	className,
	children,
	checked,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
	inset?: boolean;
}) {
	return (
		<DropdownMenuPrimitive.CheckboxItem
			data-slot="dropdown-menu-checkbox-item"
			data-inset={inset}
			className={cn(
				"focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-2.5 rounded-xl py-2 pr-8 pl-3 text-sm data-inset:pl-9.5 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-pointer items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			checked={checked}
			{...props}
		>
			<span
				className="absolute right-2 flex items-center justify-center pointer-events-none"
				data-slot="dropdown-menu-checkbox-item-indicator"
			>
				<DropdownMenuPrimitive.ItemIndicator>
					<IconCheck />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</DropdownMenuPrimitive.CheckboxItem>
	);
}

function DropdownMenuRadioGroup({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
	return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
	className,
	children,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
	inset?: boolean;
}) {
	return (
		<DropdownMenuPrimitive.RadioItem
			data-slot="dropdown-menu-radio-item"
			data-inset={inset}
			className={cn(
				"focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-2.5 rounded-xl py-2 pr-8 pl-3 text-sm data-inset:pl-9.5 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-pointer items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			{...props}
		>
			<span
				className="absolute right-2 flex items-center justify-center pointer-events-none"
				data-slot="dropdown-menu-radio-item-indicator"
			>
				<DropdownMenuPrimitive.ItemIndicator>
					<IconCheck />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</DropdownMenuPrimitive.RadioItem>
	);
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
	inset?: boolean;
}) {
	return (
		<DropdownMenuPrimitive.Label
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn('text-muted-foreground px-3 py-2.5 text-xs data-inset:pl-9.5', className)}
			{...props}
		/>
	);
}

function DropdownMenuSeparator({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
	return (
		<DropdownMenuPrimitive.Separator
			data-slot="dropdown-menu-separator"
			className={cn('bg-foreground/10 -mx-1 my-1 h-px', className)}
			{...props}
		/>
	);
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot="dropdown-menu-shortcut"
			className={cn(
				'text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest',
				className
			)}
			{...props}
		/>
	);
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
	return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
	inset?: boolean;
}) {
	return (
		<DropdownMenuPrimitive.SubTrigger
			data-slot="dropdown-menu-sub-trigger"
			data-inset={inset}
			className={cn(
				'focus:bg-foreground/10 hover:bg-foreground/10 data-[state=open]:bg-foreground/10 gap-2 rounded-[4px] px-2 py-1.5 pr-1.5 text-sm data-inset:pl-9.5 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 flex cursor-pointer items-center outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
				className
			)}
			{...props}
		>
			{children}
			<IconChevronRight className="ml-auto" />
		</DropdownMenuPrimitive.SubTrigger>
	);
}

function DropdownMenuSubContent({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
	return (
		<DropdownMenuPrimitive.SubContent
			data-slot="dropdown-menu-sub-content"
			className={cn(
				'data-[state=open]:animate-dropdown-open data-[state=closed]:animate-dropdown-close popover-styled w-fit font-sans whitespace-nowrap text-xs flex flex-col gap-0.5 min-w-36 p-1 z-50 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden',
				className
			)}
			{...props}
		/>
	);
}

export {
	DropdownMenu,
	DropdownMenuPortal,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
};
