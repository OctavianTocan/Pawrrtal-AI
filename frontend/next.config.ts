/**
 * Next.js configuration for the AI Nexus frontend.
 *
 * @fileoverview Sets Turborepo monorepo root for Turbopack and enables `authInterrupts` for `unauthorized()`.
 */

import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	turbopack: {
		root: path.resolve(__dirname, '../'),
	},
	experimental: {
		// https://nextjs.org/docs/app/api-reference/functions/unauthorized
		authInterrupts: true,
	},
};

export default nextConfig;
