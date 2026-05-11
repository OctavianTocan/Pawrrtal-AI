/**
 * Identity helper used to define a {@link ChatModelOption} with full type
 * inference at the call site.
 */

import type { ChatModelOption } from '../types/index.js';

/**
 * Identity wrapper for a {@link ChatModelOption} declaration.
 *
 * Useful when declaring a list inline — it lets TypeScript pick up the
 * literal `id` type for downstream usage without forcing the consumer to
 * annotate `ChatModelOption[]` themselves.
 *
 * @param option - The model option to declare.
 * @returns The same option, typed as `ChatModelOption`.
 */
export function defineChatModel(option: ChatModelOption): ChatModelOption {
	return option;
}
