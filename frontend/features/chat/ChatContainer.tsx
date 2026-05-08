import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { useChatActivity } from '@/features/nav-chats/context/chat-activity-context';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useRouter } from '@/lib/navigation';
import type { AgnoMessage } from '@/lib/types';
import ChatView from './ChatView';
import {
	CHAT_MODEL_IDS,
	CHAT_REASONING_LEVELS,
	type ChatModelId,
	type ChatReasoningLevel,
} from './components/ModelSelectorPopover';
import {
	CHAT_STORAGE_KEYS,
	DEFAULT_CHAT_MODEL_ID,
	DEFAULT_REASONING_LEVEL,
	FALLBACK_TITLE_MAX_LENGTH,
} from './constants';
import { useChat } from './hooks/use-chat';
import { useChatBackgroundRecovery } from './hooks/use-chat-background-recovery';
import { useChatTurns } from './hooks/use-chat-turns';
import { useComposerMessage } from './hooks/use-composer-message';
import { useCreateConversation } from './hooks/use-create-conversation';
import { useGenerateConversationTitle } from './hooks/use-generate-conversation-title';

/** Runtime guard for persisted model IDs — older builds may have stored a now-renamed model. */
function isChatModelId(value: unknown): value is ChatModelId {
	return typeof value === 'string' && (CHAT_MODEL_IDS as readonly string[]).includes(value);
}

/** Runtime guard for persisted reasoning levels — same rationale as {@link isChatModelId}. */
function isChatReasoningLevel(value: unknown): value is ChatReasoningLevel {
	return (
		typeof value === 'string' && (CHAT_REASONING_LEVELS as readonly string[]).includes(value)
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
	initialChatHistory?: Array<AgnoMessage>;
}

/**
 * Stateful container that manages the chat lifecycle.
 *
 * Responsibilities:
 * - Creates a new conversation on first message (via {@link useCreateConversation}).
 * - Fires LLM title generation (via {@link useGenerateConversationTitle}).
 * - Streams assistant responses and accumulates chat history (via {@link useChatTurns}).
 * - Keeps the browser URL and the Next.js router in sync.
 *
 * Render logic is delegated to the presentational {@link ChatView}.
 */
export default function ChatContainer({
	conversationId,
	initialChatHistory,
}: ChatContainerProps): React.JSX.Element {
	const { streamMessage } = useChat();
	const createConversationMutation = useCreateConversation(conversationId);
	const generateConversationTitleMutation = useGenerateConversationTitle(conversationId);
	const router = useRouter();
	const { setActiveConversation, clearActiveConversation } = useChatActivity();
	const hasNavigated = useRef(false);

	const {
		message,
		setMessage,
		onUpdateMessage: handleUpdateMessage,
		onReplaceMessageContent: handleReplaceMessageContent,
		onSelectSuggestion: handleSelectSuggestion,
	} = useComposerMessage();
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

	// Adapt the (prompt, conversation, model) transport to a (prompt)-only API
	// so `useChatTurns` stays decoupled from routing/model concerns.
	const stream = useCallback(
		(prompt: string) => streamMessage(prompt, conversationId, selectedModelId),
		[conversationId, selectedModelId, streamMessage]
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
		async (sentMessage: PromptInputMessage): Promise<void> => {
			setMessage({ content: '', files: [] });
			beginStream(sentMessage.content);
			try {
				await send(sentMessage.content);
			} finally {
				endStream();
				// Sync the Next.js router after streaming so sidebar router.push works.
				if (hasNavigated.current) router.replace(`/c/${conversationId}`);
			}
		},
		[beginStream, conversationId, endStream, router, send, setMessage]
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

	// Keep the sidebar's chat-activity context in sync. Fires on every change so
	// the sidebar can show spinners, unread badges, and content-search matches.
	useEffect(() => {
		setActiveConversation({ conversationId, chatHistory, isLoading });
	}, [chatHistory, conversationId, isLoading, setActiveConversation]);

	// Clear activity state on unmount, guarded by conversationId so a stale
	// cleanup doesn't clobber a newly opened conversation.
	useEffect(
		() => () => clearActiveConversation(conversationId),
		[clearActiveConversation, conversationId]
	);

	return (
		<ChatView
			chatHistory={chatHistory}
			copiedMessageId={copiedId}
			isLoading={isLoading}
			message={message}
			onCopy={handleCopy}
			onRegenerate={handleRegenerate}
			onReplaceMessageContent={handleReplaceMessageContent}
			onSelectModel={setSelectedModelId}
			onSelectReasoning={setSelectedReasoning}
			onSelectSuggestion={handleSelectSuggestion}
			onSendMessage={handleSendMessage}
			onUpdateMessage={handleUpdateMessage}
			regeneratingIndex={regeneratingIndex}
			selectedModelId={selectedModelId}
			selectedReasoning={selectedReasoning}
		/>
	);
}
