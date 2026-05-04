'use client';

/**
 * Animated thinking indicator — three dots that bounce in sequence.
 *
 * @fileoverview AI Elements — `thinking-dots`.
 */

export function ThinkingDots() {
	return (
		<span className="inline-flex items-center gap-[3px]" aria-label="Thinking">
			{[0, 150, 300].map((delay) => (
				<span
					key={delay}
					className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
					style={{ animationDelay: `${delay}ms`, animationDuration: '1s' }}
				/>
			))}
		</span>
	);
}
