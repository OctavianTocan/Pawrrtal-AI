import { atom } from "jotai";
import type { Conversation } from "@/lib/types";

/** All conversations for the current user (populated by TanStack Query). */
export const conversationsAtom = atom<Conversation[]>([]);

/** ID of the currently selected conversation, or null if none. */
export const selectedConversationIdAtom = atom<string | null>(null);

/** Derived read-only atom that resolves the selected conversation object. */
export const selectedConversationAtom = atom<Conversation | undefined>(
	(get) => {
		const id = get(selectedConversationIdAtom);
		if (!id) return undefined;
		return get(conversationsAtom).find((c) => c.id === id);
	},
);

/**
 * Adapter atom that maps our Conversation type to the session shape
 * Craft's UI components expect.
 *
 * Craft sessions have at minimum: id, name, createdAt, updatedAt.
 */
export const craftSessionsAtom = atom((get) => {
	return get(conversationsAtom).map((c) => ({
		id: c.id,
		name: c.title,
		createdAt: c.created_at,
		updatedAt: c.updated_at,
	}));
});
