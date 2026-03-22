import type { AgnoMessage } from "@/lib/types";

export type Turn = {
	role: "user" | "assistant";
	messages: AgnoMessage[];
};

/**
 * Groups consecutive messages by role into turns.
 * E.g. [user, assistant, user, assistant] -> [{role: "user", messages: [...]}, {role: "assistant", messages: [...]}, ...]
 */
export function groupMessagesByTurn(messages: AgnoMessage[]): Turn[] {
	if (messages.length === 0) return [];

	const turns: Turn[] = [];
	let current: Turn | null = null;

	for (const msg of messages) {
		if (current && current.role === msg.role) {
			current.messages.push(msg);
		} else {
			current = { role: msg.role, messages: [msg] };
			turns.push(current);
		}
	}

	return turns;
}
