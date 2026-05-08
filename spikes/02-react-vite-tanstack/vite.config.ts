import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
	plugins: [
		// Order matters: router plugin must run before the React plugin so
		// generated route files exist for Babel to transform.
		TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
		react(),
	],
	server: { port: 5174 },
});
