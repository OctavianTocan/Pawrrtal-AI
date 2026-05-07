'use client';

import type * as React from 'react';
import { useEffect } from 'react';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { useWhimsyTile } from '@/features/whimsy';
import type { AgnoMessage } from '@/lib/types';
import { Conversation, ConversationContent } from '../../components/ai-elements/conversation';
import type { PromptInputMessage } from '../../components/ai-elements/prompt-input';
import { AssistantMessage } from './components/AssistantMessage';
import { ChatComposer } from './components/ChatComposer';
import { ChatPromptSuggestions } from './components/ChatPromptSuggestions';
import type { ChatModelId, ChatReasoningLevel } from './components/ModelSelectorPopover';
import { UserMessage } from './components/UserMessage';

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
 *
 * The outer panel uses `rounded-surface-lg` (`--radius-surface-lg` in `globals.css`,
 * DESIGN.md `rounded.lg`) so its corners match {@link ChatComposer} and composer
 * dropdown chrome. Avoid `rounded-xl` here: with `--radius: 0`, `rounded-xl` is only ~4px.
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
	const whimsy = useWhimsyTile();

	// Chat panel reads `--background-elevated` directly via inline style.
	// Inline style is used (rather than a `bg-…` Tailwind utility) because the
	// Tailwind v4 build was not always picking up new `@theme` tokens during
	// hot-reload, and the user observed the chat panel rendering as a stale
	// gray on every preset. The CSS variable itself, defined in globals.css
	// as `color-mix(in srgb, var(--foreground) 1.5%, var(--background))`,
	// is computed live: when the AppearanceProvider rewrites `--background`
	// or `--foreground` on `<html>`, the panel re-derives — slightly darker
	// than the canvas when foreground is dark, slightly lighter when
	// foreground is light, re-tinting per preset hue.
	return (
		<div
			className="relative z-10 flex h-[calc(100svh-3rem)] min-h-0 w-full overflow-hidden rounded-surface-lg px-4 shadow-panel-floating"
			style={{ backgroundColor: 'var(--background-elevated)' }}
		>
			{/*
			 * Whimsy texture overlay. Sits behind all chat content via tree
			 * order: an absolute sibling without z-index paints after static
			 * children, so the content wrappers below need `relative` to
			 * appear above it (see .claude/rules/figma/check-stacking-context-
			 * for-absolute-backgrounds.md).
			 *
			 * Inputs come from the user-tunable config in
			 * `frontend/features/whimsy` (Settings → Appearance → Whimsy
			 * texture). Color is `currentColor` (text-foreground), and overall
			 * intensity is multiplied through CSS `opacity` from the same
			 * config — so the texture re-tints with theme tokens. When the
			 * user disables the texture, `cssUrl` is null and the overlay is
			 * skipped entirely.
			 */}
			{whimsy.cssUrl ? (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 text-foreground"
					style={{
						backgroundColor: 'currentColor',
						opacity: whimsy.opacity,
						maskImage: whimsy.cssUrl,
						WebkitMaskImage: whimsy.cssUrl,
						maskSize: whimsy.maskSize,
						WebkitMaskSize: whimsy.maskSize,
						maskRepeat: 'repeat',
						WebkitMaskRepeat: 'repeat',
					}}
				/>
			) : null}
			{isEmptyConversation ? (
				<div className="relative mx-auto flex h-full w-full max-w-[60rem] min-w-0 flex-col">
					<div className="flex min-h-0 flex-1 flex-col items-center pt-[24vh]">
						{/* `mb-10` (40px) for breathing room between the headline and
						    the composer; `mb-6` parked them too tight against each
						    other for a landing surface. */}
						<h1 className="mb-10 text-center text-[28px] font-medium tracking-normal text-balance text-foreground sm:text-[30px]">
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
				<div className="relative flex h-full w-full min-w-0 flex-col">
					<Conversation
						className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
						resize="smooth"
					>
						{/* `pt-12` (48px) so the first message lands a comfortable
						    distance below the panel's rounded top edge — `py-6`
						    parked the first turn flush with the chrome and read
						    as cramped. Bottom padding stays `pb-6` so the last
						    message has breathing room above the composer. */}
						<ConversationContent className="scrollbar-hide mx-auto w-full max-w-[48.75rem] px-0 pt-12 pb-6">
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
								const userMessageId = `user-${index}`;
								return (
									<UserMessage
										content={chatMessage.content}
										isCopied={copiedMessageId === userMessageId}
										key={key}
										onCopy={
											onCopy
												? () => onCopy(userMessageId, chatMessage.content)
												: undefined
										}
									/>
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
							// Follow-up turn — fixed placeholder rather than the
							// rotating landing-page tip carousel.
							placeholderOverride="Ask a follow up"
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
