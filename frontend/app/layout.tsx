/**
 * Root Next.js layout: HTML shell, theme bootstrap script, and global providers.
 *
 * @fileoverview Applies FOUC-safe dark-mode class before hydration and wraps the tree in {@link Providers}.
 */

import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
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
		<html lang="en" suppressHydrationWarning className={newsreader.variable}>
			{/*
				suppressHydrationWarning is required because the blocking theme script
				below may add the 'dark' class to <html> before React hydration, causing
				a mismatch between server and client. This is intentional and safe — the
				script only modifies the class list, not the DOM structure.
			*/}
			<head>
				{/* System theme detection — blocking script before hydration to prevent FOUC */}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var d=document.documentElement;if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(e){e.matches?d.classList.add('dark'):d.classList.remove('dark')})}catch(e){}})()`,
					}}
				/>
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
			</body>
		</html>
	);
}
