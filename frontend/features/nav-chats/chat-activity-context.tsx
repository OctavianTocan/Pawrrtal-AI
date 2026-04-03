'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AgnoMessage } from '@/lib/types';

type ActiveConversationState = {
  conversationId: string | null;
  chatHistory: AgnoMessage[];
  isLoading: boolean;
};

type ChatActivityContextValue = ActiveConversationState & {
  setActiveConversation: (state: ActiveConversationState) => void;
  clearActiveConversation: (conversationId: string) => void;
};

const ChatActivityContext = createContext<ChatActivityContextValue | null>(null);

export function ChatActivityProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<ActiveConversationState>({
    conversationId: null,
    chatHistory: [],
    isLoading: false,
  });

  const value = useMemo<ChatActivityContextValue>(
    () => ({
      ...state,
      setActiveConversation: setState,
      clearActiveConversation: (conversationId) => {
        setState((current) =>
          current.conversationId === conversationId
            ? { conversationId: null, chatHistory: [], isLoading: false }
            : current
        );
      },
    }),
    [state]
  );

  return <ChatActivityContext.Provider value={value}>{children}</ChatActivityContext.Provider>;
}

export function useChatActivity(): ChatActivityContextValue {
  const context = useContext(ChatActivityContext);
  if (!context) {
    throw new Error('useChatActivity must be used within ChatActivityProvider.');
  }
  return context;
}
