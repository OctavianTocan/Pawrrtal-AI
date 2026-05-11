import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		primitives: 'src/primitives/index.ts',
		hooks: 'src/hooks/index.ts',
		types: 'src/types/index.ts',
	},
	format: ['esm', 'cjs'],
	dts: true,
	splitting: false,
	clean: true,
	treeshake: true,
	external: [
		'react',
		'react-dom',
		'@octavian-tocan/react-dropdown',
		'@radix-ui/react-tooltip',
		'clsx',
		'tailwind-merge',
		'lucide-react',
		'tailwindcss',
	],
	onSuccess: async () => {
		// Copy CSS files to dist/styles so the package can be imported via the
		// subpath exports (`@octavian-tocan/react-chat-composer/styles/theme.css`).
		const distStylesDir = join(process.cwd(), 'dist', 'styles');
		mkdirSync(distStylesDir, { recursive: true });
		copyFileSync(
			join(process.cwd(), 'src', 'styles', 'theme.css'),
			join(distStylesDir, 'theme.css'),
		);
		copyFileSync(
			join(process.cwd(), 'src', 'styles', 'animations.css'),
			join(distStylesDir, 'animations.css'),
		);
		console.log('✓ Copied theme.css + animations.css to dist/styles');
	},
});
