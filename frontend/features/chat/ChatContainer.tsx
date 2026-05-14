'use client';
import type { ChatComposerMessage } from '@octavian-tocan/react-chat-composer';
import { useRouter } from 'next/navigation';
import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatActivity } from '@/features/nav-chats/context/chat-activity-context';
import { usePersistedState } from '@/hooks/use-persisted-state';
import type { ChatMessage } from '@/lib/types';
import ChatView from './ChatView';
import {
	CHAT_REASONING_LEVELS,
	CHAT_STORAGE_KEYS,
	type ChatReasoningLevel,
	DEFAULT_REASONING_LEVEL,
	FALLBACK_TITLE_MAX_LENGTH,
} from './constants';
import { useChat } from './hooks/use-chat';
import { useChatBackgroundRecovery } from './hooks/use-chat-background-recovery';
import { type ChatModelOption, useChatModels } from './hooks/use-chat-models';
import { useChatTurns } from './hooks/use-chat-turns';
import { useCreateConversation } from './hooks/use-create-conversation';
import { useGenerateConversationTitle } from './hooks/use-generate-conversation-title';
import { isCanonicalModelId } from './lib/is-canonical-model-id';

/** Runtime guard for persisted reasoning levels. */
function isChatReasoningLevel(value: unknown): value is ChatReasoningLevel {
	return (
		typeof value === 'string' && (CHAT_REASONING_LEVELS as readonly string[]).includes(value)
	);
}

/**
 * Placeholder used while the persisted model ID is hydrating from
 * `localStorage` and/or the catalog request is in flight.
 *
 * `usePersistedState` requires a literal default, but we don't know the
 * catalog default until `useChatModels` resolves. The empty string never
 * passes {@link isCanonicalModelId}, so {@link resolveSelectedModelId}
 * always replaces it with the live catalog default on the first render
 * the catalog is available.
 */
const PENDING_MODEL_ID = '';

/**
 * Resolve the model ID to render: prefer the persisted value if it is both
 * canonically shaped AND present in the live catalog; otherwise fall back
 * to the catalog's `is_default` entry.
 *
 * Stale legacy IDs (e.g. `'gpt-5.5'` left over from an older build) fail
 * the canonical regex up-front, so this function never has to know about
 * legacy slugs explicitly.
 */
function resolveSelectedModelId(
	persistedId: string,
	models: readonly ChatModelOption[],
	defaultEntry: ChatModelOption | null
): string {
	if (
		isCanonicalModelId(persistedId) &&
		models.some((model): boolean => model.id === persistedId)
	) {
		return persistedId;
	}
	return defaultEntry?.id ?? '';
}

/** Return shape for {@link useSelectedChatModel}. */
interface UseSelectedChatModelResult {
	/** Live model catalog from `GET /api/v1/models`. */
	models: readonly ChatModelOption[];
	/** Currently selected canonical model ID — empty string while the catalog loads. */
	selectedModelId: string;
	/** Setter that writes the new selection through `usePersistedState`. */
	setPersistedModelId: (value: string | ((prev: string) => string)) => void;
	/** True until the first catalog response lands. */
	isCatalogLoading: boolean;
}

/**
 * Hoists the catalog fetch + persisted-selection resolution so
 * {@link ChatContainer} stays under the project's per-function line budget.
 *
 * Storage value: canonical model ID (`host:vendor/model`) or `''` while
 * we're waiting for the catalog to seed the default. The validator
 * rejects any string that doesn't match the canonical shape, so
 * legacy slugs left in `localStorage` (e.g. `'gpt-5.5'`) silently fall
 * back to the catalog default on first read.
 */
function useSelectedChatModel(): UseSelectedChatModelResult {
	const { models, default: defaultModel, isLoading: isCatalogLoading } = useChatModels();

	const [persistedModelId, setPersistedModelId] = usePersistedState<string>({
		storageKey: CHAT_STORAGE_KEYS.selectedModelId,
		defaultValue: PENDING_MODEL_ID,
		validate: isCanonicalModelId,
	});

	const selectedModelId = useMemo(
		() => resolveSelectedModelId(persistedModelId, models, defaultModel),
		[persistedModelId, models, defaultModel]
	);

	return { models, selectedModelId, setPersistedModelId, isCatalogLoading };
}

/**
 * Publish chat-activity updates to the sidebar context and clear them on
 * unmount. Extracted from {@link ChatContainer} so the container stays
 * under the per-function line budget.
 */
function useChatActivitySync(
	conversationId: string,
	chatHistory: Array<ChatMessage>,
	isLoading: boolean
): void {
	const { publishActiveConversation, clearActiveConversation } = useChatActivity();

	// Keep the sidebar's chat-activity context in sync. Fires on every change so
	// the sidebar can show spinners, unread badges, and content-search matches.
	useEffect(() => {
		publishActiveConversation({ conversationId, chatHistory, isLoading });
	}, [chatHistory, conversationId, isLoading, publishActiveConversation]);

	// Clear activity state on unmount, guarded by conversationId so a stale
	// cleanup doesn't clobber a newly opened conversation.
	useEffect(
		() => () => clearActiveConversation(conversationId),
		[clearActiveConversation, conversationId]
	);
}

/**
 * Sidebar-safe fallback title before async LLM titling returns: trimmed first line, ellipsized.
 */
function buildInitialConversationTitle(content: string): string {
	const collapsedContent = content.trim().replace(/\s+/g, ' ');

	if (!collapsedContent) {
		return 'New Conversation';
	}

	if (collapsedContent.length <= FALLBACK_TITLE_MAX_LENGTH) {
		return collapsedContent;
	}

	return `${collapsedContent.slice(0, FALLBACK_TITLE_MAX_LENGTH - 3).trimEnd()}...`;
}

/**
 * Props for the {@link ChatContainer} component.
 */
interface ChatContainerProps {
	/** The conversation UUID. Always required so messages can be linked to a conversation. */
	conversationId: string;
	/** Pre-fetched messages to hydrate the chat on load (e.g. when opening an existing conversation). */
	initialChatHistory?: Array<ChatMessage>;
}

/**
 * Stateful container that manages the chat lifecycle.
 *
 * Responsibilities:
 * - Creates a new conversation on first message (via {@link useCreateConversation}).
 * - Fires LLM title generation (via {@link useGenerateConversationTitle}).
 * - Streams assistant responses and accumulates chat history (via {@link useChatTurns}).
 * - Keeps the browser URL and the Next.js router in sync.
 * - Fetches the live model catalog (via {@link useChatModels}) and resolves
 *   the persisted selection against it.
 *
 * Render logic is delegated to the presentational {@link ChatView}. The
 * composer's textarea value lives here as a plain controlled string —
 * `@octavian-tocan/react-chat-composer` accepts both controlled (`value` +
 * `onChange`) and uncontrolled modes; pawrrtal uses the controlled form so
 * the container can clear the draft on submit + insert prompt suggestions
 * programmatically.
 */
export default function ChatContainer({
	conversationId,
	initialChatHistory,
}: ChatContainerProps): React.JSX.Element | null {
	const { streamMessage } = useChat();
	const createConversationMutation = useCreateConversation(conversationId);
	const generateConversationTitleMutation = useGenerateConversationTitle(conversationId);
	const { replace } = useRouter();
	const hasNavigated = useRef(false);

	// Server-owned model catalog (`GET /api/v1/models`). The hook resolves the
	// persisted selection against the live catalog so this function stays
	// under the per-function line budget. Render is gated on
	// `isCatalogLoading` below so streaming can never fire on `''`.
	const { models, selectedModelId, setPersistedModelId, isCatalogLoading } =
		useSelectedChatModel();

	// Composer textarea — controlled string so the container can reset it on
	// send + write into it from suggestion clicks.
	const [composerText, setComposerText] = useState('');
	const [selectedReasoning, setSelectedReasoning] = usePersistedState<ChatReasoningLevel>({
		storageKey: CHAT_STORAGE_KEYS.selectedReasoning,
		defaultValue: DEFAULT_REASONING_LEVEL,
		validate: isChatReasoningLevel,
	});

	// Adapt the (prompt, conversation, model) transport to a (prompt)-only API
	// so `useChatTurns` stays decoupled from routing/model concerns.
	const stream = useCallback(
		(prompt: string) =>
			streamMessage(prompt, conversationId, selectedModelId, selectedReasoning),
		[conversationId, selectedModelId, selectedReasoning, streamMessage]
	);

	// First-send: persist the conversation, fire title gen, swap URL without
	// interrupting the in-flight stream. Router sync happens after streaming.
	const onFirstSend = useCallback(
		async (prompt: string): Promise<void> => {
			await createConversationMutation.mutateAsync({
				title: buildInitialConversationTitle(prompt),
			});
			generateConversationTitleMutation.mutateAsync(prompt).catch(() => undefined);
			window.history.replaceState(null, '', `/c/${conversationId}`);
			hasNavigated.current = true;
		},
		[conversationId, createConversationMutation, generateConversationTitleMutation]
	);

	const initialHistory = useMemo(() => initialChatHistory ?? [], [initialChatHistory]);
	const { chatHistory, isLoading, regeneratingIndex, copiedId, send, regenerate, copy } =
		useChatTurns({
			initialHistory,
			streamMessage: stream,
			onFirstSend,
		});

	// Detect interrupted assistant turns left behind by a previous mount and
	// resume them when the user reloads / navigates back to the conversation.
	const { beginStream, endStream } = useChatBackgroundRecovery({
		chatHistory,
		conversationId,
		isLoading,
		onRecover: (prompt) => {
			void send(prompt);
		},
	});

	const handleSendMessage = useCallback(
		async (message: ChatComposerMessage): Promise<void> => {
			const prompt = message.text;
			setComposerText('');
			beginStream(prompt);
			try {
				await send(prompt);
			} finally {
				endStream();
				// Sync the Next.js router after streaming so sidebar router.push works.
				if (hasNavigated.current) replace(`/c/${conversationId}`);
			}
		},
		[beginStream, conversationId, endStream, replace, send]
	);

	// Read chatHistory through a ref so the callback identity doesn't churn
	// on every streamed event — we only need the current value at click time.
	const chatHistoryRef = useRef(chatHistory);
	chatHistoryRef.current = chatHistory;
	const handleRegenerate = useCallback(
		async (assistantIndex: number): Promise<void> => {
			const userMessage = chatHistoryRef.current[assistantIndex - 1];
			if (userMessage?.role === 'user') beginStream(userMessage.content);
			try {
				await regenerate(assistantIndex);
			} finally {
				endStream();
			}
		},
		[beginStream, endStream, regenerate]
	);

	const handleCopy = useCallback(
		(id: string, text: string) => {
			void copy(id, text);
		},
		[copy]
	);

	const handleSelectSuggestion = useCallback((prompt: string) => {
		setComposerText(prompt);
	}, []);

	useChatActivitySync(conversationId, chatHistory, isLoading);

	// Gate render on the catalog so streaming can never fire on an empty
	// model ID — see `useSelectedChatModel`. Keeps dev-console-smoke clean.
	if (isCatalogLoading || selectedModelId === '') return null;

	return (
		<ChatView
			chatHistory={chatHistory}
			composerText={composerText}
			copiedMessageId={copiedId}
			isLoading={isLoading}
			models={models}
			onChangeComposerText={setComposerText}
			onCopy={handleCopy}
			onRegenerate={handleRegenerate}
			onSelectModel={setPersistedModelId}
			onSelectReasoning={setSelectedReasoning}
			onSelectSuggestion={handleSelectSuggestion}
			onSendMessage={handleSendMessage}
			regeneratingIndex={regeneratingIndex}
			selectedModelId={selectedModelId}
			selectedReasoning={selectedReasoning}
		/>
	);
}
