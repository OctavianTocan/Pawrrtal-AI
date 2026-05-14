/**
 * `/docs` landing page: a two-card chooser that routes visitors to
 * either the internal handbook or the user-facing product docs.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Pawrrtal Docs',
	description: 'Pawrrtal documentation: handbook (contributors and agents) and product (users).',
};

/**
 * Renders the docs landing with handbook + product entries.
 *
 * @returns the chooser page
 */
export default function DocsLanding(): React.ReactElement {
	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
			<header className="flex flex-col gap-2">
				<h1 className="text-3xl font-medium">Pawrrtal Docs</h1>
				<p className="text-fd-muted-foreground">Pick a section.</p>
			</header>
			<div className="grid gap-4 sm:grid-cols-2">
				<Link
					href="/docs/handbook"
					className="cursor-pointer rounded-lg border border-fd-border bg-fd-card p-6 transition-colors hover:bg-fd-accent"
				>
					<h2 className="text-lg font-medium">Handbook</h2>
					<p className="mt-1 text-sm text-fd-muted-foreground">
						Architecture decisions, agent guidance, CI, deployment. For contributors and
						agents.
					</p>
				</Link>
				<Link
					href="/docs/product"
					className="cursor-pointer rounded-lg border border-fd-border bg-fd-card p-6 transition-colors hover:bg-fd-accent"
				>
					<h2 className="text-lg font-medium">Product</h2>
					<p className="mt-1 text-sm text-fd-muted-foreground">
						How to use Pawrrtal: models, modes, settings, and more. For users.
					</p>
				</Link>
			</div>
		</main>
	);
}
