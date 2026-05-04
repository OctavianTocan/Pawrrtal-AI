'use client';
import { useRouter } from 'next/navigation';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { useChatActivity } from '@/features/nav-chats/context/chat-activity-context';
import { usePersistedState } from '@/hooks/use-persisted-state';
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

function replaceLastAssistantMessage({
	messages,
	content,
}: {
	messages: Array<AgnoMessage>;
	content: string;
}): Array<AgnoMessage> {
	const updatedMessages = [...messages];
	updatedMessages[updatedMessages.length - 1] = {
		...updatedMessages[updatedMessages.length - 1],
		role: 'assistant',
		content,
	};
	return updatedMessages;
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
 * - Streams assistant responses and accumulates chat history.
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

	/**
	 * Tracks whether we've already updated the URL to `/c/:id`.
	 * Ensures the conversation is only created once (on the first message).
	 */
	const hasNavigated = useRef(false);
	const isSendingRef = useRef(false);

	const [message, setMessage] = useState<PromptInputMessage>({
		content: '',
		files: [],
	});
	const [isLoading, setIsLoading] = useState(false);
	const [chatHistory, setChatHistory] = useState<Array<AgnoMessage>>(initialChatHistory || []);
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

	/**
	 * Handles sending a message from the user.
	 *
	 * On the first message in a new conversation this will:
	 * 1. Persist the conversation to the backend.
	 * 2. Kick off async title generation.
	 * 3. Swap the URL bar to `/c/:id` via `replaceState` (avoiding a re-render mid-stream).
	 *
	 * Then it streams the assistant's response chunk-by-chunk and appends to chat history.
	 * After streaming completes, it syncs the Next.js router so future client-side
	 * navigations (e.g. "New Conversation") work correctly.
	 */
	const handleSendMessage = async (message: PromptInputMessage): Promise<void> => {
		if (isSendingRef.current || isLoading) {
			return;
		}

		isSendingRef.current = true;
		const newMessage = message;
		setMessage({ content: '', files: [] });
		setIsLoading(true);

		// Optimistically append the user message and an empty assistant placeholder.
		setChatHistory((prev) => [
			...prev,
			{ role: 'user', content: newMessage.content } as AgnoMessage,
			{ role: 'assistant', content: '' } as AgnoMessage,
		]);

		let assistantMessage = '';

		try {
			if (!hasNavigated.current) {
				await createConversationMutation.mutateAsync({
					title: buildInitialConversationTitle(newMessage.content),
				});
				// Fire-and-forget: title generation shouldn't block the conversation flow.
				generateConversationTitleMutation
					.mutateAsync(newMessage.content)
					.catch(() => undefined);

				// Use replaceState for an instant URL swap without interrupting the stream.
				// The Next.js router is synced after streaming finishes (see below).
				window.history.replaceState(null, '', `/c/${conversationId}`);
				hasNavigated.current = true;
			}

			for await (const chunk of streamMessage(
				newMessage.content,
				conversationId,
				selectedModelId
			)) {
				assistantMessage += chunk || '';
				setChatHistory((prev) =>
					replaceLastAssistantMessage({ messages: prev, content: assistantMessage })
				);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Chat stream failed.';
			setChatHistory((prev) =>
				replaceLastAssistantMessage({ messages: prev, content: `Error: ${errorMessage}` })
			);
		} finally {
			setIsLoading(false);
			isSendingRef.current = false;

			// Sync the Next.js router now that streaming is done.
			// replaceState earlier left the router desynced — this call aligns its
			// internal state so that router.push("/") in the sidebar works correctly.
			if (hasNavigated.current) {
				router.replace(`/c/${conversationId}`);
			}
		}
	};

	// Keep the sidebar's chat-activity context in sync with this chat's state.
	// Fires on every history/loading change so the sidebar can show spinners,
	// unread badges, and content-search matches for the active conversation.
	useEffect(() => {
		setActiveConversation({
			conversationId,
			chatHistory,
			isLoading,
		});
	}, [chatHistory, conversationId, isLoading, setActiveConversation]);

	// Clear activity state on unmount, guarded by conversationId so a stale
	// cleanup doesn't clobber a newly opened conversation.
	useEffect(
		() => () => clearActiveConversation(conversationId),
		[clearActiveConversation, conversationId]
	);

	/** Updates the controlled message state as the user types. */
	const handleUpdateMessage = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
		setMessage({ ...message, content: e.currentTarget.value });
	};

	/** Replaces the controlled message content while preserving attachments. */
	const handleReplaceMessageContent = (content: string): void => {
		setMessage((currentMessage) => ({ ...currentMessage, content }));
	};

	/** Fills the composer with a suggested prompt without sending it. */
	const handleSelectSuggestion = (prompt: string): void => {
		setMessage({ content: prompt, files: [] });
	};

	return (
		<ChatView
			message={message}
			isLoading={isLoading}
			chatHistory={chatHistory}
			selectedModelId={selectedModelId}
			selectedReasoning={selectedReasoning}
			onSendMessage={handleSendMessage}
			onReplaceMessageContent={handleReplaceMessageContent}
			onSelectModel={setSelectedModelId}
			onSelectReasoning={setSelectedReasoning}
			onSelectSuggestion={handleSelectSuggestion}
			onUpdateMessage={handleUpdateMessage}
		/>
	);
}
