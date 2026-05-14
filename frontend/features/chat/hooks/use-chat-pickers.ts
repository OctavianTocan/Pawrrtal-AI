/**
 * Persisted-state pickers for the chat composer (model id + reasoning level).
 *
 * Extracted from {@link ChatContainer} so the container stays under the
 * project's per-function line budget — both pickers are independent and
 * already share the persistence pattern, so consolidating their hooks
 * here clarifies that they're a unit rather than two unrelated bits of
 * state that happen to live next to each other.
 */

import { usePersistedState } from '@/hooks/use-persisted-state';
import {
	CHAT_REASONING_LEVELS,
	type ChatModelId,
	type ChatReasoningLevel,
} from '../components/ModelSelectorPopover';
import { CHAT_STORAGE_KEYS, DEFAULT_CHAT_MODEL_ID, DEFAULT_REASONING_LEVEL } from '../constants';

/** Setter shape returned by `usePersistedState`. */
type SetState<T> = (value: T | ((current: T) => T)) => void;

/**
 * Runtime guard for the persisted model id.
 *
 * The backend catalog (`GET /api/v1/models`) is the source of truth for
 * which model ids are accepted; the chat router additionally accepts
 * both the canonical `"<provider>/<model>"` form and legacy bare SDK
 * ids.  Validating "any non-empty string" here keeps older persisted
 * values working — if the value is unrecognised the backend's
 * `canonicalise()` falls back to the catalog default.
 */
function isChatModelId(value: unknown): value is ChatModelId {
	return typeof value === 'string' && value.length > 0;
}

/** Runtime guard for persisted reasoning levels — same rationale as {@link isChatModelId}. */
function isChatReasoningLevel(value: unknown): value is ChatReasoningLevel {
	return (
		typeof value === 'string' && (CHAT_REASONING_LEVELS as readonly string[]).includes(value)
	);
}

/** Result of {@link useChatPickers}. */
export interface ChatPickers {
	/** Currently selected chat model id (canonical or legacy bare form). */
	selectedModelId: ChatModelId;
	/** Persist a new model id selection — survives reloads via localStorage. */
	setSelectedModelId: SetState<ChatModelId>;
	/** Currently selected reasoning level. */
	selectedReasoning: ChatReasoningLevel;
	/** Persist a new reasoning level — survives reloads via localStorage. */
	setSelectedReasoning: SetState<ChatReasoningLevel>;
}

/**
 * Read+write the two composer pickers (model id, reasoning level) from
 * localStorage, with runtime guards so a stale persisted value upgrades
 * cleanly instead of crashing the picker.
 */
export function useChatPickers(): ChatPickers {
	const [selectedModelId, setSelectedModelId] = usePersistedState<ChatModelId>({
		storageKey: CHAT_STORAGE_KEYS.selectedModelId,
		defaultValue: DEFAULT_CHAT_MODEL_ID,
		validate: isChatModelId,
	});
	const [selectedReasoning, setSelectedReasoning] = usePersistedState<ChatReasoningLevel>({
		storageKey: CHAT_STORAGE_KEYS.selectedReasoning,
		defaultValue: DEFAULT_REASONING_LEVEL,
		validate: isChatReasoningLevel,
	});
	return {
		selectedModelId,
		setSelectedModelId,
		selectedReasoning,
		setSelectedReasoning,
	};
}
