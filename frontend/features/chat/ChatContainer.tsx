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
import { ChatInput } from "@/components/input/ChatInput";
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
	const handleSubmit = useCallback(async () => {
		const content = messageContent.trim();
		if (!content) return;

		if (!hasNavigated.current) {
			await createConversationMutation.mutateAsync();
			// Fire-and-forget: title generation shouldn't block the conversation flow.
			generateConversationTitleMutation.mutateAsync(content);

			// Use replaceState for an instant URL swap without interrupting the stream.
			// The Next.js router is synced after streaming finishes (see below).
			window.history.replaceState(null, "", `/c/${conversationId}`);
			hasNavigated.current = true;
		}

		setMessageContent("");
		setIsLoading(true);
		setIsStreaming(true);
		setStreamingStartedAt(Date.now());

		// Optimistically append the user message and an empty assistant placeholder.
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

		// Sync the Next.js router now that streaming is done.
		// replaceState earlier left the router desynced -- this call aligns its
		// internal state so that router.push("/") in the sidebar works correctly.
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

	/** Updates the controlled message state as the user types. */
	const onUpdateMessage = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
		setMessageContent(e.currentTarget.value);
	}, []);

	const handleModelChange = useCallback(
		(modelId: string) => {
			setSelectedModelId(modelId);
		},
		[setSelectedModelId],
	);

	return (
		<div className="overflow-hidden sm:max-w-[80%] lg:max-w-[60%] xl:max-w-[50%] mx-auto">
			<div className="h-[90vh] flex flex-col overflow-hidden">
				<ChatView />
				<ChatInput
					value={messageContent}
					onChange={onUpdateMessage}
					onSubmit={handleSubmit}
					onModelChange={handleModelChange}
					disabled={isLoading}
					placeholder="Ask anything about your memories or search the web..."
					className="mx-2 mb-2"
				/>
			</div>
		</div>
	);
}
