import { atom } from "jotai";

/** Represents an LLM model available for selection. */
export interface Model {
	/** Unique model identifier (e.g. "gpt-4o", "claude-sonnet-4-20250514"). */
	id: string;
	/** Human-readable display name. */
	name: string;
	/** Provider slug (e.g. "openai", "anthropic"). */
	provider: string;
}

/** Available models list. */
export const modelsAtom = atom<Model[]>([]);

/** Currently selected model ID. */
export const selectedModelIdAtom = atom<string>("");
