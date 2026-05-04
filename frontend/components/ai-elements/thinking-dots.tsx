'use client';

/**
 * Animated loading indicator for in-progress AI responses.
 *
 * @fileoverview AI Elements — `thinking-dots`.
 *
 * Renders three small circles that bounce in a staggered sequence
 * (150 ms apart) to communicate that the assistant is generating a
 * response.  Uses Tailwind’s `animate-bounce` utility with inline
 * `animationDelay` overrides — no additional CSS required.
 *
 * Replace the static “Thinking...” text in `ChatView` with this
 * component whenever `isLoading` is true.
 */

/**
 * Three staggered bouncing dots that signal an in-progress AI response.
 *
 * The dots share a 1 s animation cycle but are offset by 0 ms, 150 ms,
 * and 300 ms so they ripple left-to-right rather than bouncing in sync.
 *
 * The wrapping `<span>` carries `aria-label="Thinking"` so screen
 * readers announce the loading state without reading out three empty
 * elements.
 */
export function ThinkingDots() {
	return (
		<span className="inline-flex items-center gap-[3px]" aria-label="Thinking">
			{/* Each dot is a filled circle; delay staggers the bounce phase. */}
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
