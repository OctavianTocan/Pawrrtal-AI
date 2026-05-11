'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn.js';

/** Visual style variants used by composer-side buttons. Derived from shadcn/ui. */
export type ButtonVariant = 'default' | 'ghost' | 'outline' | 'destructive';

/** Size tokens — match the heights the composer toolbar wants (8 = 32px, etc.). */
export type ButtonSize = 'default' | 'sm' | 'icon-sm' | 'icon-xs' | 'xs';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	default:
		'bg-[var(--color-chat-accent)] text-[var(--color-chat-accent-foreground)] hover:opacity-90',
	ghost: 'bg-transparent text-[var(--color-chat-foreground)] hover:bg-[color:rgb(0_0_0_/_0.04)]',
	outline:
		'border border-[var(--color-chat-border)] bg-transparent text-[var(--color-chat-foreground)] hover:bg-[color:rgb(0_0_0_/_0.04)]',
	destructive:
		'bg-[var(--color-chat-destructive)] text-[var(--color-chat-accent-foreground)] hover:opacity-90',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
	default: 'h-9 px-4 text-sm',
	sm: 'h-8 px-3 text-sm',
	xs: 'h-7 px-2 text-[12px]',
	'icon-sm': 'h-8 w-8 p-0',
	'icon-xs': 'h-7 w-7 p-0',
};

/** Props for the minimal Button primitive used inside the composer. */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
	/** Visual variant. Defaults to `ghost` — the most common composer style. */
	variant?: ButtonVariant;
	/** Size token. Defaults to `default`. */
	size?: ButtonSize;
	/** HTML button type. Defaults to `'button'` to prevent accidental form submits. */
	type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}

/**
 * Minimal shadcn-derived button used by composer-side controls. Exposes just
 * the variants the composer needs; consumers can compose additional classes
 * via `className`.
 *
 * @param props - Standard button props plus `variant` + `size` tokens.
 * @returns A button element with the chat-* token style baked in.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ className, variant = 'ghost', size = 'default', type = 'button', ...rest },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			className={cn(
				'inline-flex cursor-pointer items-center justify-center gap-1 rounded-[var(--radius-chat-sm)] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
				VARIANT_CLASSES[variant],
				SIZE_CLASSES[size],
				className,
			)}
			{...rest}
		/>
	);
});
