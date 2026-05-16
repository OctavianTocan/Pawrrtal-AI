'use client';

import type * as React from 'react';
import { ButtonGroup as BaseButtonGroup } from '@/features/_shared/ui/button-group';
import type { GlassCustomization } from '@/lib/glass-utils';
import { type HoverEffect, hoverEffects } from '@/lib/hover-effects';
import { cn } from '@/lib/utils';

export interface ButtonGroupProps extends React.ComponentProps<typeof BaseButtonGroup> {
	effect?: HoverEffect;
	glass?: GlassCustomization;
	variant?: string;
}

/**
 * Glass UI Button Group - A beautifully designed button group with glassy effects
 * Built on top of the base ButtonGroup component with enhanced visual styling
 */
export function ButtonGroup({
	className,
	variant: _variant = 'glass',
	effect = 'none',
	glass,
	ref,
	...props
}: ButtonGroupProps): React.JSX.Element {
	return (
		<BaseButtonGroup
			ref={ref}
			className={cn(hoverEffects({ hover: effect }), className)}
			{...props}
		/>
	);
}
