/**
 * Application entry point.
 *
 * Mount order matches the official auth-and-guards skill:
 *   <Providers>            (TanStack Query + Sonner toaster)
 *     <AuthProvider>       (auth state + login/logout)
 *       <RouterProvider>   (TanStack Router; receives auth via context)
 *
 * The auth provider must wrap the router because the router's
 * route-level `beforeLoad` guards consume `context.auth` — that
 * context value is plumbed via `<RouterProvider context={{ auth }}>`
 * inside `<InnerApp>` so we can read the React hook without breaking
 * rules-of-hooks.
 */

import { Agentation } from 'agentation';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './auth';
import { Providers } from './providers';
import { router } from './router';
import { THEME_DETECTION_SCRIPT } from '@/lib/theme-detection-script';
import './styles/globals.css';

// FOUC-safe theme bootstrap.  Replaces the previous server-rendered
// `<script dangerouslySetInnerHTML>` in app/layout.tsx.
//
// biome-ignore lint/security/noGlobalEval: deliberate inline-script execution
new Function(THEME_DETECTION_SCRIPT)();

// react-grab in dev only.  Previously loaded via next/script
// `beforeInteractive`; we add a vanilla `<script>` to the head.
if (import.meta.env.DEV) {
	const s = document.createElement('script');
	s.src = '//unpkg.com/react-grab/dist/index.global.js';
	s.crossOrigin = 'anonymous';
	document.head.appendChild(s);
}

function InnerApp(): React.JSX.Element {
	const auth = useAuth();
	return <RouterProvider router={router} context={{ auth }} />;
}

const rootEl = document.getElementById('root');
if (rootEl === null) throw new Error('#root missing in index.html');

createRoot(rootEl).render(
	<StrictMode>
		<Providers>
			<AuthProvider>
				<InnerApp />
				{import.meta.env.DEV ? <Agentation /> : null}
			</AuthProvider>
		</Providers>
	</StrictMode>,
);
