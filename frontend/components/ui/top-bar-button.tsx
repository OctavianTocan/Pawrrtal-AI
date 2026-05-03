import * as React from 'react';

import { cn } from '@/lib/utils';

type TopBarButtonProps = React.ComponentProps<'button'> & {
	isActive?: boolean;
};

export const TopBarButton = React.forwardRef<HTMLButtonElement, TopBarButtonProps>(
	({ children, className, disabled, isActive, ...props }, ref) => {
		return (
			<button
				ref={ref}
				type="button"
				disabled={disabled}
				className={cn(
					'flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors duration-100',
					'cursor-pointer hover:bg-foreground/5 focus:outline-none focus-visible:ring-0',
					'disabled:pointer-events-none disabled:opacity-30',
					isActive && 'bg-foreground/5',
					className
				)}
				{...props}
			>
				{children}
			</button>
		);
	}
);

TopBarButton.displayName = 'TopBarButton';
