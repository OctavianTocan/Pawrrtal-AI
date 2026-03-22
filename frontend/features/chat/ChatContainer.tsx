"use client";

import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
	isStreamingAtom,
	messagesAtom,
	selectedConversationIdAtom,
	streamingStartedAtAtom,
} from "@/atoms";
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorName,
	ModelSelectorSeparator,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
	PromptInput,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import type { AgnoMessage, PromptInputMessage } from "@/lib/types";
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

	/**
	 * Tracks whether we've already updated the URL to `/c/:id`.
	 * Ensures the conversation is only created once (on the first message).
	 */
	const hasNavigated = useRef(false);

	const [message, setMessage] = useState<PromptInputMessage>({
		content: "",
		files: [],
	});
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

	// Model selector state
	const [open, setOpen] = useState(false);
	const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");

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
	const handleSendMessage = async (msg: PromptInputMessage) => {
		if (!hasNavigated.current) {
			await createConversationMutation.mutateAsync();
			// Fire-and-forget: title generation shouldn't block the conversation flow.
			generateConversationTitleMutation.mutateAsync(msg.content);

			// Use replaceState for an instant URL swap without interrupting the stream.
			// The Next.js router is synced after streaming finishes (see below).
			window.history.replaceState(null, "", `/c/${conversationId}`);
			hasNavigated.current = true;
		}

		const newMessage = msg;
		setMessage({ content: "", files: [] });
		setIsLoading(true);
		setIsStreaming(true);
		setStreamingStartedAt(Date.now());

		// Optimistically append the user message and an empty assistant placeholder.
		setChatHistory((prev) => [
			...prev,
			{ role: "user", content: newMessage.content } as AgnoMessage,
			{ role: "assistant", content: "" } as AgnoMessage,
		]);

		let assistantMessage = "";

		for await (const chunk of streamMessage(
			newMessage.content,
			conversationId,
		)) {
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
		// replaceState earlier left the router desynced — this call aligns its
		// internal state so that router.push("/") in the sidebar works correctly.
		if (hasNavigated.current) {
			router.replace(`/c/${conversationId}`);
		}
	};

	/** Updates the controlled message state as the user types. */
	const onUpdateMessage = (e: ChangeEvent<HTMLTextAreaElement>) => {
		setMessage({ ...message, content: e.currentTarget.value });
	};

	return (
		<div className="overflow-hidden sm:max-w-[80%] lg:max-w-[60%] xl:max-w-[50%] mx-auto">
			<div className="h-[90vh] flex flex-col overflow-hidden">
				<ChatView />
				<PromptInput onSubmit={handleSendMessage} className="px-2 pb-2">
					<PromptInputTextarea
						placeholder="Ask anything about your memories or search the web..."
						className="pr-16 bg-white min-h-12.5"
						onChange={onUpdateMessage}
						value={message.content}
					/>
					<PromptInputFooter>
						<ModelSelector open={open} onOpenChange={setOpen}>
							<ModelSelectorTrigger asChild>
								<Button variant="outline">
									<ModelSelectorLogo provider="google" />
									{selectedModel}
								</Button>
							</ModelSelectorTrigger>
							<ModelSelectorContent>
								<ModelSelectorInput placeholder="Search models..." />
								<ModelSelectorList>
									<ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
									<ModelSelectorGroup heading="Google">
										<ModelSelectorItem
											value="gemini-3-flash-preview"
											onSelect={() => {
												setSelectedModel("gemini-3-flash-preview");
												setOpen(false);
											}}
										>
											<ModelSelectorLogo provider="google" />
											<ModelSelectorName>
												Gemini 3 Flash Preview
											</ModelSelectorName>
										</ModelSelectorItem>
									</ModelSelectorGroup>
									<ModelSelectorSeparator />
								</ModelSelectorList>
							</ModelSelectorContent>
						</ModelSelector>
						<PromptInputSubmit
							disabled={message.content.length === 0}
							className="absolute bottom-1 right-1 cursor-pointer"
							status={isLoading ? "streaming" : "ready"}
						/>
					</PromptInputFooter>
				</PromptInput>
			</div>
		</div>
	);
}
