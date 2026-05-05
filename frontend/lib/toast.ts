/**
 * Project-wide toast wrapper.
 *
 * Wraps `sonner` so feature code never imports it directly. Centralising the
 * import lets us swap the underlying library or globally tweak defaults
 * (duration, position, dedupe IDs) without touching every call site.
 *
 * @fileoverview Re-export of the sonner `toast` API with project-friendly defaults.
 */

import { toast as sonnerToast } from 'sonner';

/**
 * The sonner toast singleton with our defaults applied.
 *
 * Exposed as a single export so usage stays terse: `toast.success('Saved')`.
 */
export const toast = sonnerToast;

/**
 * Stable IDs for repeated toasts so that, for example, rapid Flag/Unflag clicks
 * collapse into a single visible toast that just updates its message instead
 * of stacking five copies on top of each other.
 *
 * Pass an entry to `toast.success(message, { id: TOAST_IDS.flag })` etc.
 */
export const TOAST_IDS = {
	conversationFlag: 'conversation:flag',
	conversationArchive: 'conversation:archive',
	conversationUnread: 'conversation:unread',
	conversationStatus: 'conversation:status',
	conversationLabel: 'conversation:label',
	conversationCopyLink: 'conversation:copy-link',
	conversationRegenerateTitle: 'conversation:regenerate-title',
	conversationDuplicate: 'conversation:duplicate',
	conversationExport: 'conversation:export',
} as const;

/** Stable toast IDs used to collapse repeated toasts of the same kind. */
export type ToastId = (typeof TOAST_IDS)[keyof typeof TOAST_IDS];
