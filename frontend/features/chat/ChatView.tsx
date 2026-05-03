'use client';

import type * as React from 'react';
import { useEffect } from 'react';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import type { AgnoMessage } from '@/lib/types';
import { Conversation, ConversationContent } from '../../components/ai-elements/conversation';
import { Loader } from '../../components/ai-elements/loader';
import type { PromptInputMessage } from '../../components/ai-elements/prompt-input';
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
}: ChatProps): React.JSX.Element {
  const isEmptyConversation = chatHistory.length === 0;

  return (
    <div className="flex h-[calc(100svh-2.25rem)] min-h-0 w-full overflow-hidden rounded-l-xl bg-background px-4 shadow-modal-small">
      <div className="mx-auto flex h-full w-full max-w-[60rem] min-w-0 flex-col">
        {isEmptyConversation ? (
          <div className="flex min-h-0 flex-1 flex-col items-center pt-[24vh]">
            <h1 className="mb-8 text-center text-[28px] font-medium tracking-normal text-foreground sm:text-[30px]">
              What should we build in AI Nexus?
            </h1>
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
            <ChatPromptSuggestions className="mt-5" onSelectSuggestion={onSelectSuggestion} />
          </div>
        ) : (
          <>
            <Conversation className="min-h-0 flex-1 overflow-y-auto" resize="smooth">
              <ConversationContent className="mx-auto w-full max-w-[48.75rem] px-0 py-6">
                {chatHistory.map((chatMessage, index) => (
                  <Message from={chatMessage.role} key={`${chatMessage.role}-${index}`}>
                    <MessageContent>
                      <MessageResponse>{chatMessage.content}</MessageResponse>
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
              </ConversationContent>
              <ChatScrollAnchor track={chatHistory.length} />
            </Conversation>
            <div className="flex shrink-0 justify-center pb-4">
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
          </>
        )}
      </div>
    </div>
  );
}

export default ChatView;
