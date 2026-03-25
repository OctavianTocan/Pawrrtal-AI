"use client";

import { useEffect, useState } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
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
import { Button } from "@/components/ui/button";
import type { AgnoMessage } from "@/lib/types";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
} from "../../components/ai-elements/conversation";
import { Loader } from "../../components/ai-elements/loader";
import type { PromptInputMessage } from "../../components/ai-elements/prompt-input";
import {
	PromptInput,
	PromptInputFooter,
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
	// Need to fix this.
	const [open, setOpen] = useState(false);
	const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");

	return (
		<div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pb-4 md:px-6 md:pb-6">
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-foreground/8 bg-background-elevated/90 shadow-modal-small backdrop-blur-sm">
				<div className="border-b border-foreground/8 px-5 py-4 sm:px-6">
					<p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/45">
						AI Nexus
					</p>
					<h1 className="mt-1 font-medium text-base tracking-tight text-foreground">
						Chat
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Stay focused on the conversation.
					</p>
				</div>
				<Conversation
					className="min-h-0 flex-1 overflow-y-auto"
					resize="smooth"
				>
					<ConversationContent className="mx-auto flex w-full max-w-3xl flex-1 gap-6 px-5 py-6 sm:px-6">
						{chatHistory.length === 0 ? (
							<ConversationEmptyState
								className="min-h-[40vh] gap-4"
								description="Ask about your memories, explore an idea, or pick up where you left off."
								title="Start a conversation"
								icon={
									<div className="flex size-12 items-center justify-center rounded-full border border-foreground/10 bg-background shadow-minimal">
										<div className="size-2 rounded-full bg-accent" />
									</div>
								}
							/>
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
				<div className="border-t border-foreground/8 bg-background/80 px-3 py-3 sm:px-4">
					<PromptInput
						onSubmit={onSendMessage}
						className="mx-auto w-full max-w-3xl"
					>
						<PromptInputTextarea
							placeholder="Ask anything about your memories or search the web..."
							className="min-h-12.5 pr-16"
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
		</div>
	);
};

export default ChatView;
