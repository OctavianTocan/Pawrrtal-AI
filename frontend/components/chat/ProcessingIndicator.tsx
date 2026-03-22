"use client";

import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { isStreamingAtom, streamingStartedAtAtom } from "@/atoms";

const statusStrings = [
	"Thinking...",
	"Analyzing...",
	"Generating...",
	"Writing...",
];

export default function ProcessingIndicator() {
	const isStreaming = useAtomValue(isStreamingAtom);
	const streamingStartedAt = useAtomValue(streamingStartedAtAtom);
	const [statusIndex, setStatusIndex] = useState(0);
	const [elapsed, setElapsed] = useState(0);

	// Cycle status strings
	useEffect(() => {
		if (!isStreaming) {
			setStatusIndex(0);
			return;
		}
		const interval = setInterval(() => {
			setStatusIndex((prev) => (prev + 1) % statusStrings.length);
		}, 2500);
		return () => clearInterval(interval);
	}, [isStreaming]);

	// Elapsed timer
	useEffect(() => {
		if (!isStreaming || !streamingStartedAt) {
			setElapsed(0);
			return;
		}
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - streamingStartedAt) / 1000));
		}, 1000);
		return () => clearInterval(interval);
	}, [isStreaming, streamingStartedAt]);

	return (
		<AnimatePresence>
			{isStreaming && (
				<motion.div
					className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground"
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -4 }}
					transition={{ duration: 0.2 }}
				>
					<span className="inline-flex size-2 animate-pulse rounded-full bg-accent" />
					<AnimatePresence mode="wait">
						<motion.span
							key={statusIndex}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
						>
							{statusStrings[statusIndex]}
						</motion.span>
					</AnimatePresence>
					{elapsed > 0 && (
						<span className="text-xs tabular-nums opacity-60">{elapsed}s</span>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
