'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import { API_ENDPOINTS } from '@/lib/api';
import type { AgnoMessage, Conversation } from '@/lib/types';

export type ContentSearchResult = {
  matchCount: number;
  snippet: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOccurrences(content: string, query: string): number {
  if (!query) {
    return 0;
  }

  const matches = content.match(new RegExp(escapeRegExp(query), 'gi'));
  return matches?.length ?? 0;
}

function buildSnippet(content: string, query: string): string {
  const matchIndex = content.toLowerCase().indexOf(query.toLowerCase());
  if (matchIndex < 0) {
    return '';
  }

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(content.length, matchIndex + query.length + 40);
  return content.slice(start, end).trim();
}

function extractSearchableText(messages: AgnoMessage[]): string {
  return messages.map((message) => message.content).join('\n');
}

function fuzzyScore(title: string, query: string): number {
  const lowerTitle = title.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerTitle.includes(lowerQuery)) {
    return lowerQuery.length * 10;
  }

  let queryIndex = 0;
  let score = 0;

  for (const char of lowerTitle) {
    if (char === lowerQuery[queryIndex]) {
      queryIndex += 1;
      score += 2;
      if (queryIndex === lowerQuery.length) {
        return score;
      }
    }
  }

  return 0;
}

export function rankConversationsForSearch(
  conversations: Conversation[],
  query: string,
  contentSearchResults: Map<string, ContentSearchResult>,
  _activeChatMatchInfo?: { sessionId: string; count: number } | null
): Conversation[] {
  return [...conversations].sort((left, right) => {
    const leftScore = fuzzyScore(left.title, query);
    const rightScore = fuzzyScore(right.title, query);

    if (leftScore > 0 && rightScore === 0) {
      return -1;
    }

    if (leftScore === 0 && rightScore > 0) {
      return 1;
    }

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    const leftCount = contentSearchResults.get(left.id)?.matchCount ?? 0;
    const rightCount = contentSearchResults.get(right.id)?.matchCount ?? 0;

    if (leftCount !== rightCount) {
      return rightCount - leftCount;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

export function useConversationSearch({
  conversations,
  searchQuery,
  activeConversationId,
  activeChatHistory,
}: {
  conversations: Conversation[];
  searchQuery: string;
  activeConversationId?: string | null;
  activeChatHistory?: AgnoMessage[];
}) {
  const fetcher = useAuthedFetch();
  const cacheRef = useRef(new Map<string, AgnoMessage[]>());
  const [contentSearchResults, setContentSearchResults] = useState<
    Map<string, ContentSearchResult>
  >(new Map());
  const trimmedQuery = searchQuery.trim();
  const isSearchActive = trimmedQuery.length >= 2;

  useEffect(() => {
    if (!isSearchActive) {
      setContentSearchResults(new Map());
      return;
    }

    let cancelled = false;

    const computeResults = async () => {
      const missingConversationIds = conversations
        .map((conversation) => conversation.id)
        .filter((conversationId) => !cacheRef.current.has(conversationId));

      if (missingConversationIds.length > 0) {
        await Promise.all(
          missingConversationIds.map(async (conversationId) => {
            try {
              const response = await fetcher(
                API_ENDPOINTS.conversations.getMessages(conversationId)
              );
              const payload = (await response.json()) as AgnoMessage[];
              cacheRef.current.set(conversationId, payload);
            } catch {
              cacheRef.current.set(conversationId, []);
            }
          })
        );
      }

      if (cancelled) {
        return;
      }

      const nextResults = new Map<string, ContentSearchResult>();
      for (const conversation of conversations) {
        const chatHistory = cacheRef.current.get(conversation.id) ?? [];
        const searchableText = extractSearchableText(chatHistory);
        const titleCount = countOccurrences(conversation.title, trimmedQuery);
        const contentCount = countOccurrences(searchableText, trimmedQuery);
        const matchCount = titleCount + contentCount;

        if (
          matchCount > 0 ||
          conversation.title.toLowerCase().includes(trimmedQuery.toLowerCase())
        ) {
          nextResults.set(conversation.id, {
            matchCount,
            snippet: buildSnippet(searchableText || conversation.title, trimmedQuery),
          });
        }
      }

      setContentSearchResults(nextResults);
    };

    void computeResults();

    return () => {
      cancelled = true;
    };
  }, [conversations, fetcher, isSearchActive, trimmedQuery]);

  const activeChatMatchInfo = useMemo(() => {
    if (!isSearchActive || !activeConversationId || !activeChatHistory) {
      return null;
    }

    const searchableText = extractSearchableText(activeChatHistory);
    const count = countOccurrences(searchableText, trimmedQuery);
    return {
      sessionId: activeConversationId,
      count,
    };
  }, [activeChatHistory, activeConversationId, isSearchActive, trimmedQuery]);

  return {
    contentSearchResults,
    activeChatMatchInfo,
    isSearchActive,
  };
}
