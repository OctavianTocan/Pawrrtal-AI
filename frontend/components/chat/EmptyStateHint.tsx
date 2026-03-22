"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const hints = [
	"Ask me anything...",
	"Try asking about your project...",
	"I can help with code review...",
	"Need help debugging something?",
	"Ask me to explain a concept...",
	"I can help draft documents...",
	"Try asking me to brainstorm ideas...",
	"I can analyze data for you...",
];

export default function EmptyStateHint() {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setIndex((prev) => (prev + 1) % hints.length);
		}, 4000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="text-center">
				<p className="text-2xl font-semibold bg-gradient-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
					What can we build together?
				</p>
				<div className="h-6 relative">
					<AnimatePresence mode="wait">
						<motion.p
							key={index}
							className="text-sm text-muted-foreground absolute inset-x-0"
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							transition={{ duration: 0.3 }}
						>
							{hints[index]}
						</motion.p>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
