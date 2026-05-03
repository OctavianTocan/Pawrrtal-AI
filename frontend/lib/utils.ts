import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names with `clsx` conditional logic, then resolves conflicts via `tailwind-merge`.
 *
 * @param inputs - Any values accepted by `clsx` (strings, objects, arrays, falsy to omit).
 * @returns A single concatenated class string safe for Tailwind specificity.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
