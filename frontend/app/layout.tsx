/**
 * Root Next.js layout: HTML shell, theme bootstrap script, and global providers.
 *
 * @fileoverview Applies FOUC-safe dark-mode class before hydration and wraps the tree in {@link Providers}.
 */

import { Agentation } from 'agentation';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Google_Sans, Google_Sans_Flex, Newsreader } from 'next/font/google';
import Script from 'next/script';
import { THEME_DETECTION_SCRIPT } from '@/lib/theme-detection-script';
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
 * Google Sans Flex + Google Sans — default UI sans stack (`--font-sans-stack`
 * in `globals.css`). Flex is the primary face; Google Sans covers environments
 * where Flex subsets differ. Both expose CSS variables for `var(...)` chains.
 */
/**
 * `adjustFontFallback: false` opts out of Next.js's automatic
 * size-adjusted fallback generation. Next.js can't find override
 * metric values for `Google Sans Flex` / `Google Sans` in its
 * built-in font database, so without this flag Next.js emits the
 *   "Failed to find font override values for font `Google Sans Flex`"
 *   "Skipping generating a fallback font."
 * pair of warnings on every dev start.
 *
 * The CLS impact is bounded by the rest of the
 * `--font-sans-stack` chain in `globals.css` — the cascade falls
 * back to "Helvetica Neue" / `sans-serif`, which both have similar
 * x-heights to Google Sans, so the layout shift between fallback
 * and web font is minimal in practice. Once Next.js ships override
 * metrics for Google Sans (or we bump to a future version that
 * does), this flag can be removed.
 */
const googleSansFlex = Google_Sans_Flex({
	subsets: ['latin'],
	weight: 'variable',
	variable: '--font-google-sans-flex-loaded',
	display: 'swap',
	adjustFontFallback: false,
});
const googleSans = Google_Sans({
	subsets: ['latin'],
	weight: 'variable',
	variable: '--font-google-sans-loaded',
	display: 'swap',
	adjustFontFallback: false,
});

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
	title: 'AI Nexus',
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
			className={`${newsreader.variable} ${googleSansFlex.variable} ${googleSans.variable} ${geist.variable} ${geistMono.variable}`}
		>
			{/*
				suppressHydrationWarning is required because the blocking theme script
				below may add the 'dark' class to <html> before React hydration, causing
				a mismatch between server and client. This is intentional and safe — the
				script only modifies the class list, not the DOM structure.
			*/}
			<head>
				{/* System theme detection — blocking script before hydration to prevent FOUC.
				    Body lives in `frontend/lib/theme-detection-script.ts` so the JSX surface
				    here stays small. The `noDangerouslySetInnerHtml` rule is silenced for
				    this file via biome.json's `frontend/app/layout.tsx` override (the
				    body is a static string from a server-only module — no user input). */}
				<script dangerouslySetInnerHTML={{ __html: THEME_DETECTION_SCRIPT }} />
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
