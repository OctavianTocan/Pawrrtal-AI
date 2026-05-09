/**
 * Root Next.js layout: HTML shell, theme bootstrap script, and global providers.
 *
 * @fileoverview Applies FOUC-safe dark-mode class before hydration and wraps the tree in {@link Providers}.
 */

import { Agentation } from 'agentation';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';

/**
 * Editorial display face — Mistral-inspired near-serif voice for hero
 * displays and `h1`. Self-hosted via `next/font/google` so the variable
 * file is FOUC-safe; the loaded family is exposed as the CSS variable
 * `--font-display-loaded`, which the `--font-display-stack` in
 * `globals.css` references with a system-serif fallback chain so heading
 * type still has editorial character before the web font arrives.
 */
const newsreader = Newsreader({
	subsets: ['latin'],
	weight: ['400', '500', '600'],
	variable: '--font-display-loaded',
	display: 'swap',
});

/**
 * Google Sans Flex + Google Sans — default UI sans stack (`--font-sans-stack` in
 * `globals.css`). **Not** loaded with `next/font/google`: those families are
 * missing from Next.js’s capsize fallback metrics DB, so the loader logs
 * “Failed to find font override values…” on every dev start (and
 * `adjustFontFallback: false` is unreliable in some Next 15/16 versions).
 * Instead we add a standard Google Fonts `<link>` in `<head>` (see below) so
 * the same public `fonts.gstatic.com` files load without the metrics pipeline.
 */

/**
 * Geist + Geist Mono — preloaded so the Cursor preset's typography
 * actually renders the moment the user picks it. The fonts cite
 * themselves by name (`"Geist"`, `"Geist Mono"`) inside the preset's
 * font stack, so as long as the families are resident in the DOM, the
 * preset paints correctly.
 */
const geist = Geist({
	subsets: ['latin'],
	variable: '--font-geist-loaded',
	display: 'swap',
});
const geistMono = Geist_Mono({
	subsets: ['latin'],
	variable: '--font-geist-mono-loaded',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Pawrrtal',
	description:
		'An AI chat application built with Next.js and FastAPI, all by hand, no code generation tools (or AI) used.',
};

/**
 * Root layout for all routes: `Providers` + blocking theme script on `<html>`.
 */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${newsreader.variable} ${geist.variable} ${geistMono.variable}`}
		>
			{/*
				suppressHydrationWarning is required because the blocking theme script
				below may add the 'dark' class to <html> before React hydration, causing
				a mismatch between server and client. This is intentional and safe — the
				script only modifies the class list, not the DOM structure.
			*/}
			<head>
				<link href="https://fonts.googleapis.com" rel="preconnect" />
				<link href="https://fonts.gstatic.com" crossOrigin="anonymous" rel="preconnect" />
				<link
					href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400..700&family=Google+Sans:wght@400..700&display=swap"
					rel="stylesheet"
				/>
				{/* System theme detection — runs synchronously before hydration
				    to prevent FOUC.  Body lives in `frontend/public/theme-detection.js`.

				    Why a `src="/theme-detection.js"` script rather than an inline body:
				    React 19's client reconciler emits a fatal warning ("Encountered
				    a script tag while rendering React component") for any `<script>`
				    element it sees with inline content — including those produced by
				    `next/script` with `dangerouslySetInnerHTML` or children.  The
				    warning cascades and breaks hydration of the rest of the tree
				    (notably the `QueryClientProvider` in `app/providers.tsx`, which
				    surfaces as a secondary "No QueryClient set" error).  A `<Script
				    src>` tag has no body and is treated identically to the React Grab
				    loader below — React skips it on the client and the warning never
				    fires.  Verified against the failure mode reported by the operator
				    on 2026-05-08. */}
				<Script src="/theme-detection.js" strategy="beforeInteractive" />
				{/* React Grab */}
				{process.env.NODE_ENV === 'development' && (
					<Script
						src="//unpkg.com/react-grab/dist/index.global.js"
						crossOrigin="anonymous"
						strategy="beforeInteractive"
					/>
				)}
			</head>
			<body>
				<Providers>{children}</Providers>
				{process.env.NODE_ENV === 'development' && <Agentation />}
			</body>
		</html>
	);
}
