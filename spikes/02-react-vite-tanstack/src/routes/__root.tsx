import { Outlet, createRootRoute, Link } from '@tanstack/react-router';

export const Route = createRootRoute({
	component: () => (
		<>
			<header>
				<nav>
					<Link to="/">Home</Link> · <Link to="/chat">Chat</Link>
				</nav>
			</header>
			<Outlet />
		</>
	),
});
