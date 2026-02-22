"use client";
import type { AgnoMessage } from "@/lib/types";
import ChatView from "./ChatView";
import { useRef, useState } from "react";
import { useChat } from "./hooks/use-chat";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { useQueryClient } from "@tanstack/react-query";

// TODO: Docstring
interface ChatContainerProps {
  // The ID of the conversation to link messages to. This is required, because we need to know which conversation to send the messages to. When not provided, we create a new conversation, but for now we require it to be provided, because we want to make sure that we're always linking messages to a conversation.
  conversationId: string;
  // The initial messages to populate the chat with. This is useful for when we load a conversation with existing messages, so we can show the chat history. If not provided, we start with an empty chat history.
  initialChatHistory?: Array<AgnoMessage>;
}

export default function ChatContainer({ conversationId, initialChatHistory }: ChatContainerProps) {
  // Chat Hook.
  const { streamMessage } = useChat();
  // Query Client.
  const queryClient = useQueryClient();
  // This ref is used to track whether we've already navigated to the conversation URL. We want to make sure that we only navigate once, when the user sends their first message, so that we don't mess with the browser history and cause issues with the back button.
  const hasNavigated = useRef(false);

  // Message State.
  const [message, setMessage] = useState<PromptInputMessage>({
    content: "",
    files: [],
  });

  // Loading State.
  const [isLoading, setIsLoading] = useState(false);
  // Chat History Array.
  const [chatHistory, setChatHistory] = useState<Array<AgnoMessage>>(initialChatHistory || []);

  // Add the user message to the chat history.
  const handleSendMessage = async (message: PromptInputMessage) => {
    // We navigate to the conversation URL when the user sends their first message, so that we have a unique URL for each conversation. This allows us to link messages to a specific conversation, and also allows users to share the conversation URL with others. We use replaceState instead of pushState, because we don't want to add a new entry to the browser history every time the user sends a message, we just want to replace the current entry with the new conversation URL.
    if (!hasNavigated.current) {
      window.history.replaceState(null, "", `/c/${conversationId}`);
      hasNavigated.current = true;
    }

    const newMessage = message;
    // Reset the message state. (So we can see that there's no more text in the text area, without this the text area will still show the previous message).
    setMessage({ content: "", files: [] });

    // Start the loading state.
    setIsLoading(true);

    // Add the user message to the chat history.
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: newMessage.content } as AgnoMessage,
      { role: "assistant", content: "" } as AgnoMessage,
    ]);

    // Placeholder for the assistant message.
    let assistantMessage = "";

    // Stream the response to the conversation with the given conversationId.
    for await (const chunk of streamMessage(
      newMessage.content,
      conversationId,
    )) {
      assistantMessage += chunk || "";
      // Update the assistant message in the chat history.
      setChatHistory((prev) => {
        // Create a new chat history array.
        const newChatHistory = [...prev];
        // Update the assistant message in the chat history.
        // Info: Need to define all properties, so we satisfy the Typescript compiler, because using the spread operator (...) can sometimes result in optional properties being treated as undefined.
        const newMessageIndex = newChatHistory.length - 1;
        newChatHistory[newMessageIndex] = {
          ...newChatHistory[newMessageIndex],
          role: "assistant",
          content: assistantMessage,
        };
        return newChatHistory;
      });
      // Stop the loading state. (We're already receiving the response, so we can stop the loading state).
      setIsLoading(false);
    }

    // This makes sure that the sidebar is updated with the new conversation.
    if (chatHistory.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };
  }

  // This is called when the user edits the message in the text area. We update the message state with the new content. This allows us to keep track of the current message that the user is typing, so that we can send it when they click the send button.
  const onUpdateMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage({ ...message, content: e.currentTarget.value });
  };

  return <ChatView message={message} isLoading={isLoading} chatHistory={chatHistory} onSendMessage={handleSendMessage} onUpdateMessage={onUpdateMessage} />;
}