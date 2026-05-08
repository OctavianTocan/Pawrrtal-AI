/**
 * Application entry point.
 *
 * Replaces the previous Next.js `app/layout.tsx` mount.  Responsibilities:
 *   1. Run the FOUC-safe theme detection script before React renders.
 *   2. Mount the dev-only `<Agentation>` overlay + react-grab script.
 *   3. Wrap the app in the global `<Providers>` (TanStack Query + Sonner).
 *   4. Mount the TanStack Router (file-based routes under `src/routes/`).
 */

import { Agentation } from 'agentation';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from './providers';
import { routeTree } from './routeTree.gen';
import { THEME_DETECTION_SCRIPT } from '@/lib/theme-detection-script';
import './styles/globals.css';

// FOUC-safe theme bootstrap.  Previously delivered as a server-rendered
// `<script dangerouslySetInnerHTML>` in app/layout.tsx; in a SPA we run
// it inline before React mounts so the dark/light class is on `<html>`
// before the first paint.
//
// biome-ignore lint/security/noGlobalEval: deliberate inline-script execution
new Function(THEME_DETECTION_SCRIPT)();

// react-grab in dev only.  Previously loaded via next/script
// `beforeInteractive`; we add a vanilla `<script>` to the head so it
// runs before module evaluation gets ahead of it.
if (import.meta.env.DEV) {
	const s = document.createElement('script');
	s.src = '//unpkg.com/react-grab/dist/index.global.js';
	s.crossOrigin = 'anonymous';
	document.head.appendChild(s);
}

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

const rootEl = document.getElementById('root');
if (rootEl === null) throw new Error('#root missing in index.html');

createRoot(rootEl).render(
	<StrictMode>
		<Providers>
			<RouterProvider router={router} />
			{import.meta.env.DEV ? <Agentation /> : null}
		</Providers>
	</StrictMode>,
);
