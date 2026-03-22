"use client";

import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { isStreamingAtom, messagesAtom } from "@/atoms";
import EmptyStateHint from "./EmptyStateHint";
import ProcessingIndicator from "./ProcessingIndicator";
import TurnCard from "./TurnCard";
import UserMessageBubble from "./UserMessageBubble";
import { groupMessagesByTurn } from "./utils";

export default function ChatDisplay() {
	const messages = useAtomValue(messagesAtom);
	const isStreaming = useAtomValue(isStreamingAtom);
	const scrollRef = useRef<HTMLDivElement>(null);
	const turns = groupMessagesByTurn(messages);

	// Track message count + last message content for scroll triggers
	const messageCount = messages.length;
	const lastContent = messages[messageCount - 1]?.content ?? "";

	// Scroll to bottom on new messages or content changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: we intentionally trigger on messageCount, lastContent, and isStreaming to scroll on new messages and streaming updates
	useEffect(() => {
		const el = scrollRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [messageCount, lastContent, isStreaming]);

	if (messages.length === 0) {
		return <EmptyStateHint />;
	}

	return (
		<div
			ref={scrollRef}
			className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 scroll-smooth"
		>
			{turns.map((turn) => {
				const firstContent = turn.messages[0]?.content ?? "";
				const key = `${turn.role}-${firstContent.slice(0, 32)}`;
				return turn.role === "user" ? (
					<UserMessageBubble key={key} messages={turn.messages} />
				) : (
					<TurnCard key={key} messages={turn.messages} />
				);
			})}
			<ProcessingIndicator />
		</div>
	);
}
