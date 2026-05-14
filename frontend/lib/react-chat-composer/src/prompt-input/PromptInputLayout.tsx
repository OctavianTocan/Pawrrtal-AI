/**
 * Prompt input layout slots — footer + submit button.
 *
 * @fileoverview Minimal layout primitives extracted from the AI Elements
 * `prompt-input-layout` module. Only the pieces the chat composer actually
 * uses (`PromptInputFooter`, `PromptInputSubmit`) live here; the package
 * does not vendor the full select / hover-card / command primitives.
 */

'use client';

import { CornerDownLeftIcon, Loader2Icon, SquareIcon, XIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Button, type ButtonProps } from '../ui/Button';
import { cn } from '../utils/cn';

/** Props for the footer slot rendered below the textarea. */
export interface PromptInputFooterProps extends HTMLAttributes<HTMLDivElement> {
	/** Footer children — typically the AttachButton, action selector, and submit cluster. */
	children?: ReactNode;
}

/**
 * Footer row rendered at the bottom of the composer surface. Hosts the
 * AttachButton, optional action selector slot, model picker, voice button,
 * and submit pill.
 *
 * @returns A flex row that fills the bottom of the composer surface.
 */
export function PromptInputFooter({
	className,
	children,
	...props
}: PromptInputFooterProps): React.JSX.Element {
	return (
		<div
			className={cn(
				'flex items-center justify-between gap-1 px-3 py-1.5',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

/** Chat lifecycle status used by the submit button. */
type PromptInputSubmitStatus = 'submitted' | 'streaming' | 'ready' | 'error';

/** Props for the submit pill. */
export interface PromptInputSubmitProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
	/** Visual variant — defaults to `default`. */
	variant?: ButtonProps['variant'];
	/** Size token — defaults to `icon-sm` (32px square). */
	size?: ButtonProps['size'];
	/** Reflects the current chat lifecycle (drives the embedded icon). */
	status?: PromptInputSubmitStatus;
	/** Optional override icon — wins over the status-derived icon. */
	children?: ReactNode;
}

/**
 * Submit button for the composer. Defaults to a corner-arrow glyph, swaps to
 * a spinner when the request is in flight, and to a square (stop) when the
 * response is streaming.
 *
 * @returns A `type="submit"` button styled with the chat accent token.
 */
export function PromptInputSubmit({
	className,
	variant = 'default',
	size = 'icon-sm',
	status,
	children,
	...props
}: PromptInputSubmitProps): React.JSX.Element {
	let icon: ReactNode = <CornerDownLeftIcon className="size-4" />;
	if (status === 'submitted') icon = <Loader2Icon className="size-4 animate-spin" />;
	else if (status === 'streaming') icon = <SquareIcon className="size-4" />;
	else if (status === 'error') icon = <XIcon className="size-4" />;
	return (
		<Button
			aria-label="Submit"
			className={className}
			size={size}
			type="submit"
			variant={variant}
			{...props}
		>
			{children ?? icon}
		</Button>
	);
}
