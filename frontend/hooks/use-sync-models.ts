"use client";

import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { type Model, modelsAtom, selectedModelIdAtom } from "@/atoms";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { API_ENDPOINTS } from "@/lib/api";

/**
 * Fetches available models from the API and syncs them into Jotai atoms.
 * Sets the first model as the default selection if none is already selected.
 *
 * Mount this hook once in the app tree (e.g., in AppShell alongside useSyncConversations).
 */
export function useSyncModels() {
	const { data } = useAuthedQuery<Model[]>(
		["models"],
		API_ENDPOINTS.chat.models,
	);
	const setModels = useSetAtom(modelsAtom);
	const setSelectedModelId = useSetAtom(selectedModelIdAtom);

	useEffect(() => {
		if (data && data.length > 0) {
			setModels(data);
			// Set default model if none is selected yet
			const first = data[0];
			if (!first) return;
			const defaultId = first.id;
			setSelectedModelId((current) => current || defaultId);
		}
	}, [data, setModels, setSelectedModelId]);
}
