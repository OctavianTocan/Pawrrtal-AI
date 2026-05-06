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
					'flex h-8 w-8 items-center justify-center rounded-[6px] transition duration-150',
					'cursor-pointer hover:bg-foreground/5 active:scale-[0.97] focus:outline-none focus-visible:ring-0',
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
