import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditionally join Tailwind class names and resolve conflicts in one call.
 *
 * Standard `clsx` + `tailwind-merge` wrapper used across the package's
 * components so token overrides (`bg-chat-bg-elevated` vs default
 * `bg-chat-bg-elevated-shade` etc.) resolve predictably when consumers compose
 * classes on top.
 *
 * @param inputs - Any mix of strings, arrays, and condition records that
 *   `clsx` accepts.
 * @returns The merged class-name string, deduplicated by Tailwind utility.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
