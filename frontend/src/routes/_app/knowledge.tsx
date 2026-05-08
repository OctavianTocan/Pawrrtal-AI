import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { KnowledgeContainer } from '@/features/knowledge/KnowledgeContainer';

/**
 * `/knowledge` route entry.
 *
 * Mounts the client-side {@link KnowledgeContainer} inside a `Suspense`
 * boundary.  The Next.js version needed Suspense because of
 * `useSearchParams`'s CSR bailout warning; TanStack Router doesn't have
 * that constraint, but we keep the boundary for any lazy children.
 */
export const Route = createFileRoute('/_app/knowledge')({
	component: () => (
		<Suspense fallback={null}>
			<KnowledgeContainer />
		</Suspense>
	),
});
