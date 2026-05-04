'use client';

import type * as React from 'react';
import { useEffect } from 'react';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import type { AgnoMessage } from '@/lib/types';
import { Conversation, ConversationContent } from '../../components/ai-elements/conversation';
import type { PromptInputMessage } from '../../components/ai-elements/prompt-input';
import { AssistantMessage } from './components/AssistantMessage';
import { ChatComposer } from './components/ChatComposer';
import { ChatPromptSuggestions } from './components/ChatPromptSuggestions';
import type { ChatModelId, ChatReasoningLevel } from './components/ModelSelectorPopover';

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
	/** Callback fired when generated text should replace the draft content. */
	onReplaceMessageContent: (content: string) => void;
	/** The full conversation history to render. */
	chatHistory: Array<AgnoMessage>;
	/** The selected model used for new chat requests. */
	selectedModelId: ChatModelId;
	/** The selected reasoning level shown in the composer. */
	selectedReasoning: ChatReasoningLevel;
	/** Callback fired when the model selector changes. */
	onSelectModel: (modelId: ChatModelId) => void;
	/** Callback fired when the reasoning selector changes. */
	onSelectReasoning: (reasoning: ChatReasoningLevel) => void;
	/** Callback fired when an empty-state prompt suggestion is selected. */
	onSelectSuggestion: (prompt: string) => void;
	/** Index of the assistant message currently being regenerated, if any. */
	regeneratingIndex?: number | null;
	/** ID of the message whose copy button should currently render its "Copied!" state. */
	copiedMessageId?: string | null;
	/** Copy a message body to the clipboard with feedback. */
	onCopy?: (id: string, text: string) => void;
	/** Re-run the assistant turn at the given history index. */
	onRegenerate?: (assistantIndex: number) => void;
};

/**
 * Invisible anchor component that scrolls the conversation to the bottom
 * whenever `track` changes (i.e. when new messages are added).
 *
 * Must be rendered inside a `<Conversation>` that provides the
 * `useStickToBottomContext`.
 */
function ChatScrollAnchor({ track: _track }: { track: number }): React.JSX.Element | null {
	const { scrollToBottom } = useStickToBottomContext();

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);
	return null;
}

/**
 * Presentational chat component.
 *
 * Renders the conversation history, a loading indicator while the assistant
 * is thinking, and the message composer. All state management is handled by
 * the parent {@link ChatContainer}.
 */
function ChatView({
	message,
	isLoading,
	chatHistory,
	selectedModelId,
	selectedReasoning,
	onSendMessage,
	onUpdateMessage,
	onReplaceMessageContent,
	onSelectModel,
	onSelectReasoning,
	onSelectSuggestion,
	regeneratingIndex,
	copiedMessageId,
	onCopy,
	onRegenerate,
}: ChatProps): React.JSX.Element {
	const isEmptyConversation = chatHistory.length === 0;

	return (
		<div className="relative z-10 flex h-[calc(100svh-2.25rem)] min-h-0 w-full overflow-hidden rounded-l-xl bg-background px-4 shadow-panel-floating">
			{isEmptyConversation ? (
				<div className="mx-auto flex h-full w-full max-w-[60rem] min-w-0 flex-col">
					<div className="flex min-h-0 flex-1 flex-col items-center pt-[24vh]">
						<h1 className="mb-6 text-center text-[28px] font-medium tracking-normal text-foreground sm:text-[30px]">
							What should we build in AI Nexus?
						</h1>
						<ChatComposer
							message={message}
							isLoading={isLoading}
							selectedModelId={selectedModelId}
							selectedReasoning={selectedReasoning}
							showConnectAppsStrip
							onSendMessage={onSendMessage}
							onReplaceMessageContent={onReplaceMessageContent}
							onSelectModel={onSelectModel}
							onSelectReasoning={onSelectReasoning}
							onUpdateMessage={onUpdateMessage}
						/>
						<ChatPromptSuggestions
							className="mt-5"
							onSelectSuggestion={onSelectSuggestion}
						/>
					</div>
				</div>
			) : (
				// IMPORTANT: the scroll container is intentionally NOT wrapped in
				// a `max-w-[60rem]` column. Constraining the scroll area there
				// meant the user could only scroll while the cursor was over the
				// narrow centered region — moving the mouse to either side of the
				// chat panel killed scroll capture. Letting `<Conversation>` span
				// the full panel width fixes that and parks the (hidden) scrollbar
				// flush with the panel's right edge.
				<div className="flex h-full w-full min-w-0 flex-col">
					<Conversation
						className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
						resize="smooth"
					>
						<ConversationContent className="scrollbar-hide mx-auto w-full max-w-[48.75rem] px-0 py-6">
							{chatHistory.map((chatMessage, index) => {
								const key = `${chatMessage.role}-${index}`;
								if (chatMessage.role === 'assistant') {
									const isLast = index === chatHistory.length - 1;
									const messageId = `assistant-${index}`;
									const isCurrentlyRegenerating = regeneratingIndex === index;
									return (
										<AssistantMessage
											content={chatMessage.content}
											isCopied={copiedMessageId === messageId}
											isFailed={chatMessage.assistant_status === 'failed'}
											isRegenerating={isCurrentlyRegenerating}
											isStreaming={Boolean(isLoading && isLast)}
											key={key}
											onCopy={
												onCopy
													? () => onCopy(messageId, chatMessage.content)
													: undefined
											}
											onRegenerate={
												onRegenerate ? () => onRegenerate(index) : undefined
											}
											thinking={chatMessage.thinking}
											thinkingDurationSeconds={
												chatMessage.thinking_duration_seconds
											}
											timeline={chatMessage.timeline}
											toolCalls={chatMessage.tool_calls}
										/>
									);
								}
								return (
									<Message from={chatMessage.role} key={key}>
										<MessageContent>
											<MessageResponse>{chatMessage.content}</MessageResponse>
										</MessageContent>
									</Message>
								);
							})}
						</ConversationContent>
						<ChatScrollAnchor track={chatHistory.length} />
					</Conversation>
					{/* Composer stays centered on the original `max-w-[60rem]`
					    column so the input width is unchanged — only the scroll
					    region was widened. */}
					<div className="mx-auto flex w-full max-w-[60rem] shrink-0 justify-center pb-4">
						<ChatComposer
							message={message}
							isLoading={isLoading}
							selectedModelId={selectedModelId}
							selectedReasoning={selectedReasoning}
							onSendMessage={onSendMessage}
							onReplaceMessageContent={onReplaceMessageContent}
							onSelectModel={onSelectModel}
							onSelectReasoning={onSelectReasoning}
							onUpdateMessage={onUpdateMessage}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

export default ChatView;
