/**
 * Next.js configuration for the AI Nexus frontend.
 *
 * @fileoverview Sets Turborepo monorepo root for Turbopack, enables
 * `authInterrupts` for `unauthorized()`, and rewrites barrel-style imports
 * from icon / UI libraries into direct imports at build time so the dev
 * server doesn't pay the 200–800 ms cold-start cost of resolving thousands
 * of unused re-exports.
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
		// Transforms `import { X } from 'lib'` into the underlying source
		// path so tree-shaking can drop everything else. Per the Vercel
		// `bundle-barrel-imports` rule: 15–70% faster dev boot, ~28% faster
		// builds, ~40% faster cold starts on icon-heavy code. Keep this list
		// in sync with the barrel libraries the app actually consumes.
		optimizePackageImports: [
			'lucide-react',
			'@tabler/icons-react',
			'@hugeicons/react',
			'@radix-ui/react-icons',
			'date-fns',
		],
	},
};

export default nextConfig;
