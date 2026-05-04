/**
 * Responsive overlay primitive built on `@octavian-tocan/react-overlay`.
 *
 * Renders a centered {@link Modal} on desktop and a draggable
 * {@link BottomSheet} on mobile. This is the project standard for any new
 * modal/sheet UI — see `.claude/rules/react/use-octavian-overlay-for-modals.md`.
 *
 * @fileoverview Responsive Modal/BottomSheet wrapper for ai-nexus.
 */

'use client';

import { BottomSheet, Modal, type ModalSize } from '@octavian-tocan/react-overlay';
import type * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Props accepted by {@link ResponsiveModal}.
 */
export interface ResponsiveModalProps {
	/** Whether the overlay is open. */
	open: boolean;
	/** Called when the overlay should close (overlay click, escape key, drag-down on mobile). */
	onDismiss: () => void;
	/** Overlay body. Sticky chrome (titles, footers) should be wrapped here too — desktop has no separate footer slot. */
	children: React.ReactNode;
	/**
	 * Optional sticky footer for the mobile {@link BottomSheet}. Ignored on desktop —
	 * include any desktop footer markup inside `children` instead.
	 */
	mobileFooter?: React.ReactNode;
	/** Modal size preset (desktop only). Default `md`. */
	size?: ModalSize;
	/** Whether clicking the overlay backdrop dismisses. Default `true`. */
	closeOnOverlayClick?: boolean;
	/** Whether pressing Escape dismisses. Default `true`. */
	closeOnEscape?: boolean;
	/** Whether to render the built-in dismiss (X) button on desktop. Default `false`. */
	showDismissButton?: boolean;
	/** Accessible label for screen readers when no visible heading is wired via `aria-labelledby`. */
	ariaLabel?: string;
	/** ID of the element labelling the modal (e.g. a `<DialogTitle>` analogue). */
	ariaLabelledBy?: string;
	/** ID of the element describing the modal. */
	ariaDescribedBy?: string;
	/** Test ID forwarded to the overlay root. */
	testId?: string;
}

/**
 * Pick `Modal` (desktop) or `BottomSheet` (mobile) based on viewport.
 *
 * Falls back to {@link Modal} during SSR / before hydration ({@link useIsMobile}
 * returns `false` until mounted), which matches the desktop-first chrome of
 * the rest of the app.
 *
 * @returns The active overlay rendering the supplied children.
 */
export function ResponsiveModal({
	open,
	onDismiss,
	children,
	mobileFooter,
	size = 'md',
	closeOnOverlayClick = true,
	closeOnEscape = true,
	showDismissButton = false,
	ariaLabel,
	ariaLabelledBy,
	ariaDescribedBy,
	testId,
}: ResponsiveModalProps): React.JSX.Element {
	const isMobile = useIsMobile();

	if (isMobile) {
		// BottomSheet has no aria* props of its own — wrap children in a
		// labelled `role="dialog"` region so screen readers still announce
		// the sheet correctly. BottomSheet manages focus trap + scroll lock.
		return (
			<BottomSheet open={open} onDismiss={onDismiss} footer={mobileFooter} testId={testId}>
				<div
					role="dialog"
					aria-modal="true"
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledBy}
					aria-describedby={ariaDescribedBy}
				>
					{children}
				</div>
			</BottomSheet>
		);
	}

	return (
		<Modal
			open={open}
			onDismiss={onDismiss}
			size={size}
			closeOnOverlayClick={closeOnOverlayClick}
			closeOnEscape={closeOnEscape}
			showDismissButton={showDismissButton}
			ariaLabel={ariaLabel}
			ariaLabelledBy={ariaLabelledBy}
			ariaDescribedBy={ariaDescribedBy}
			testId={testId}
		>
			{children}
		</Modal>
	);
}
