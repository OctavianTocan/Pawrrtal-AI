import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: HomePage,
});

function HomePage(): React.JSX.Element {
	return (
		<main>
			<h1>Spike 02 — React + Vite + TanStack Router</h1>
			<p>
				Type-safe file-based routing without the Next.js bundle.{' '}
				<Link to="/chat">Open chat →</Link>
			</p>
		</main>
	);
}
