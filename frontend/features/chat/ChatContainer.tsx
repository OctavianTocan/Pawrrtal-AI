"use client";

import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	isStreamingAtom,
	messagesAtom,
	selectedConversationIdAtom,
	selectedModelIdAtom,
	streamingStartedAtAtom,
} from "@/atoms";
import type { AgnoMessage } from "@/lib/types";
import ChatView from "./ChatView";
import { useChat } from "./hooks/use-chat";
import { useCreateConversation } from "./hooks/use-create-conversation";
import { useGenerateConversationTitle } from "./hooks/use-generate-conversation-title";

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
 * - Syncs local state to Jotai atoms so ChatDisplay can read them.
 *
 * Render logic is delegated to the presentational {@link ChatView}.
 */
export default function ChatContainer({
	conversationId,
	initialChatHistory,
}: ChatContainerProps) {
	const { streamMessage } = useChat();
	const createConversationMutation = useCreateConversation(conversationId);
	const generateConversationTitleMutation =
		useGenerateConversationTitle(conversationId);
	const router = useRouter();

	// Jotai setters for syncing state to atoms
	const setMessages = useSetAtom(messagesAtom);
	const setIsStreaming = useSetAtom(isStreamingAtom);
	const setStreamingStartedAt = useSetAtom(streamingStartedAtAtom);
	const setSelectedConversationId = useSetAtom(selectedConversationIdAtom);
	const setSelectedModelId = useSetAtom(selectedModelIdAtom);

	/**
	 * Tracks whether we've already updated the URL to `/c/:id`.
	 * Ensures the conversation is only created once (on the first message).
	 */
	const hasNavigated = useRef(false);

	const [messageContent, setMessageContent] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [chatHistory, setChatHistory] = useState<Array<AgnoMessage>>(
		initialChatHistory || [],
	);

	// Sync conversationId to atom
	useEffect(() => {
		setSelectedConversationId(conversationId);
	}, [conversationId, setSelectedConversationId]);

	// Sync chatHistory to messagesAtom whenever it changes
	useEffect(() => {
		setMessages(chatHistory);
	}, [chatHistory, setMessages]);

	const handleSubmit = useCallback(async () => {
		const content = messageContent.trim();
		if (!content) return;

		if (!hasNavigated.current) {
			await createConversationMutation.mutateAsync();
			generateConversationTitleMutation.mutateAsync(content);
			window.history.replaceState(null, "", `/c/${conversationId}`);
			hasNavigated.current = true;
		}

		setMessageContent("");
		setIsLoading(true);
		setIsStreaming(true);
		setStreamingStartedAt(Date.now());

		setChatHistory((prev) => [
			...prev,
			{ role: "user", content } as AgnoMessage,
			{ role: "assistant", content: "" } as AgnoMessage,
		]);

		let assistantMessage = "";

		for await (const chunk of streamMessage(content, conversationId)) {
			assistantMessage += chunk || "";
			setChatHistory((prev) => {
				const updated = [...prev];
				updated[updated.length - 1] = {
					...updated[updated.length - 1],
					role: "assistant",
					content: assistantMessage,
				};
				return updated;
			});
			setIsLoading(false);
		}

		setIsStreaming(false);
		setStreamingStartedAt(null);

		if (hasNavigated.current) {
			router.replace(`/c/${conversationId}`);
		}
	}, [
		messageContent,
		conversationId,
		createConversationMutation,
		generateConversationTitleMutation,
		streamMessage,
		router,
		setIsStreaming,
		setStreamingStartedAt,
	]);

	const onUpdateMessage = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
		setMessageContent(e.currentTarget.value);
	}, []);

	const handleModelChange = useCallback(
		(modelId: string) => {
			setSelectedModelId(modelId);
		},
		[setSelectedModelId],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	return (
		<div className="overflow-hidden sm:max-w-[80%] lg:max-w-[60%] xl:max-w-[50%] mx-auto">
			<div className="h-[90vh] flex flex-col overflow-hidden">
				<ChatView />
				<div className="mx-2 mb-2">
					<textarea
						value={messageContent}
						onChange={onUpdateMessage}
						onKeyDown={handleKeyDown}
						disabled={isLoading}
						placeholder="Ask anything about your memories or search the web..."
						className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						rows={3}
					/>
				</div>
			</div>
		</div>
	);
}
