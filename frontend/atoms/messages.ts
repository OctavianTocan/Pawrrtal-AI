import { atom } from "jotai";
import type { AgnoMessage } from "@/lib/types";

/** Messages for the currently active conversation. */
export const messagesAtom = atom<AgnoMessage[]>([]);

/** Whether the assistant is currently streaming a response. */
export const isStreamingAtom = atom<boolean>(false);

/** Timestamp (ms) when the current streaming response started, or null. */
export const streamingStartedAtAtom = atom<number | null>(null);
