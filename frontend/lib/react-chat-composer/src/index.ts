/**
 * Main entry point for `@octavian-tocan/react-chat-composer`.
 *
 * Exports the flagship `ChatComposer` container, its presentational view,
 * the suggestion list, the sample 2026 model preset, the `defineChatModel`
 * helper, and the public type surface. Reach for `./primitives` when you
 * want the composer's standalone pieces (action selector, provider logo,
 * voice meter) and `./hooks` for the hooks layer.
 */

export { ChatComposer } from './composer/ChatComposer.js';
export {
	ChatComposerView,
	type ChatComposerViewProps,
} from './composer/ChatComposerView.js';
export {
	ChatPromptSuggestions,
	type ChatPromptSuggestionsProps,
} from './prompt-suggestions/ChatPromptSuggestions.js';
export { CHAT_MODELS_2026 } from './presets/chat-models-2026.js';
export { defineChatModel } from './presets/define-chat-model.js';
export type {
	ChatComposerMessage,
	ChatComposerProps,
	ChatModelOption,
	ChatPromptSuggestion,
	ChatProviderSlug,
	ChatReasoningLevel,
} from './types/index.js';
