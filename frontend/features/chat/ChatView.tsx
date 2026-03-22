"use client";

import { useAtomValue } from "jotai";
import { messagesAtom } from "@/atoms";

/**
 * V1 chat display - renders messages from Jotai atoms.
 * This is a simplified view used by the v1 ChatContainer.
 */
export default function ChatView() {
	const messages = useAtomValue(messagesAtom);

	return (
		<div className="flex-1 overflow-y-auto p-4 space-y-4">
			{messages.map((msg, i) => (
				<div
					key={`${msg.role}-${i}`}
					className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
				>
					<div
						className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
							msg.role === "user"
								? "bg-foreground text-background"
								: "bg-muted text-foreground"
						}`}
					>
						{msg.content}
					</div>
				</div>
			))}
		</div>
	);
}
