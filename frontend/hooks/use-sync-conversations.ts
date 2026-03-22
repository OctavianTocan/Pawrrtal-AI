"use client";

import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { conversationsAtom } from "@/atoms/sessions";
import useGetConversations from "@/hooks/get-conversations";

/**
 * Syncs TanStack Query conversation data into the Jotai conversationsAtom.
 * Mount this hook once in the app tree (e.g., in LeftSidebar or AppShell).
 */
export function useSyncConversations() {
	const { data } = useGetConversations();
	const setConversations = useSetAtom(conversationsAtom);

	useEffect(() => {
		if (data) {
			setConversations(data);
		}
	}, [data, setConversations]);
}
