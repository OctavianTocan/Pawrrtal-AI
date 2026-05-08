/**
 * @fileoverview Resizable panel components wrapping react-resizable-panels.
 * Provides a set of composable panel components with resize handles for building split-pane layouts.
 */

import { GripVertical } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Hook that returns a ref for the Panel imperative handle (collapse/expand/resize). */
const usePanelRef = ResizablePrimitive.usePanelRef;

/**
 * Container component for resizable panels.
 * @param props - Component props including className, direction, and all Group props
 * @returns JSX element containing the resizable panel group
 */
const ResizablePanelGroup = ({
	className,
	direction,
	orientation: orientationProp,
	...props
}: React.ComponentProps<typeof ResizablePrimitive.Group> & {
	direction?: 'horizontal' | 'vertical';
}): React.JSX.Element => (
	<ResizablePrimitive.Group
		{...props}
		orientation={direction ?? orientationProp ?? 'horizontal'}
		className={cn(
			'flex h-full w-full data-[panel-group-direction=vertical]:flex-col',
			className
		)}
	/>
);

/**
 * Individual resizable panel component.
 * Re-exported from react-resizable-panels.
 */
const ResizablePanel = ResizablePrimitive.Panel;

/**
 * Handle component for resizing panels.
 * Renders a draggable separator between panels with optional grip handle.
 * @param props - Component props including withHandle, className, and all Separator props
 * @returns JSX element containing the resize handle
 */
const ResizableHandle = ({
	withHandle,
	className,
	...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
	withHandle?: boolean;
}): React.JSX.Element => (
	<ResizablePrimitive.Separator
		className={cn(
			'relative flex w-px items-center justify-center cursor-col-resize',
			// Invisible hit area via ::after — wider target without shifting layout
			'after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2',
			// Visual feedback on hover and active drag (only the ::after stripe)
			'hover:after:bg-sidebar-border data-[separator=active]:after:bg-sidebar-border',
			// Focus ring for keyboard accessibility
			'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1',
			// Vertical orientation overrides
			'data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize',
			'data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0',
			'[&[data-panel-group-direction=vertical]>div]:rotate-90',
			className
		)}
		{...props}
	>
		{withHandle && (
			<div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-sidebar-border">
				<GripVertical className="h-2.5 w-2.5" />
			</div>
		)}
	</ResizablePrimitive.Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle, usePanelRef };
