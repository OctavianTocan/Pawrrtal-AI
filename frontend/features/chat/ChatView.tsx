"use client";

import { useEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import type { AgnoMessage } from "@/lib/types";
import {
	Conversation,
	ConversationContent,
} from "../../components/ai-elements/conversation";
import { Loader } from "../../components/ai-elements/loader";
import type { PromptInputMessage } from "../../components/ai-elements/prompt-input";
import {
	PromptInput,
	PromptInputSubmit,
	PromptInputTextarea,
} from "../../components/ai-elements/prompt-input";

/**
 * Props for the {@link ChatView} presentational component.
 */
type ChatProps = {
	/** The current message being composed by the user. */
	message: PromptInputMessage;
	/** Whether the assistant is generating a response (shows a loading indicator). */
	isLoading?: boolean;
	/** Callback fired when the textarea content changes. */
	onUpdateMessage: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	/** Callback fired when the user submits a message. */
	onSendMessage: (message: PromptInputMessage) => void;
	/** The full conversation history to render. */
	chatHistory: Array<AgnoMessage>;
};

/**
 * Invisible anchor component that scrolls the conversation to the bottom
 * whenever `track` changes (i.e. when new messages are added).
 *
 * Must be rendered inside a `<Conversation>` that provides the
 * `useStickToBottomContext`.
 */
const ChatScrollAnchor = ({ track: _track }: { track: number }) => {
	const { scrollToBottom } = useStickToBottomContext();

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);
	return null;
};

/**
 * Presentational chat component.
 *
 * Renders the conversation history, a loading indicator while the assistant
 * is thinking, and the message composer. All state management is handled by
 * the parent {@link ChatContainer}.
 */
const ChatView = ({
	message,
	isLoading,
	chatHistory,
	onSendMessage,
	onUpdateMessage,
}: ChatProps) => {
	return (
		<div className="overflow-hidden sm:max-w-[80%] lg:max-w-[60%] xl:max-w-[50%] mx-auto">
			<div className="h-[90vh] flex flex-col overflow-hidden">
				<Conversation className="flex-1 overflow-y-auto" resize="smooth">
					<ConversationContent>
						{chatHistory.length === 0 ? (
							<div className="text-center my-auto font-semibold mt-8">
								<p className="text-3xl mt-4 bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
									What can we build together?
								</p>
							</div>
						) : (
							<>
								{chatHistory.map((message, index) => (
									<Message from={message.role} key={`${message.role}-${index}`}>
										<MessageContent>
											<MessageResponse>{message.content}</MessageResponse>
										</MessageContent>
									</Message>
								))}
								{isLoading && (
									<Message from="assistant">
										<MessageContent>
											<div className="flex items-center gap-2">
												<Loader />
												Thinking...
											</div>
										</MessageContent>
									</Message>
								)}
							</>
						)}
					</ConversationContent>
					<ChatScrollAnchor track={chatHistory.length} />
				</Conversation>
				<PromptInput onSubmit={onSendMessage} className="px-2 pb-2">
					<PromptInputTextarea
						placeholder="Ask anything about your memories or search the web..."
						className="pr-16 bg-white min-h-12.5"
						onChange={onUpdateMessage}
						value={message.content}
					/>
					<PromptInputSubmit
						disabled={message.content.length === 0}
						className="absolute bottom-1 right-1 cursor-pointer"
						status={isLoading ? "streaming" : "ready"}
					/>
				</PromptInput>
			</div>
		</div>
	);
};

export default ChatView;
